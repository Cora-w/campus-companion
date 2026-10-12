// Run with a dedicated Chrome debugging endpoint; each run uses an isolated context.
import { writeFile } from 'node:fs/promises'
const endpoint = process.env.TEACHER_QA_CDP || 'http://127.0.0.1:9345'
const appUrl = process.env.TEACHER_QA_URL || 'http://127.0.0.1:5182'
const connect = async url => {
  const ws = new WebSocket(url)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const promise = pending.get(message.id); pending.delete(message.id); if (message.error) promise.reject(message.error); else promise.resolve(message.result) } })
  return { ws, call: (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) }) }
}
const browser = await connect((await (await fetch(`${endpoint}/json/version`)).json()).webSocketDebuggerUrl)
const { browserContextId } = await browser.call('Target.createBrowserContext')
let page
try {
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId })
  page = await connect((await (await fetch(`${endpoint}/json`)).json()).find(target => target.id === targetId).webSocketDebuggerUrl)
  const call = page.call
  const ev = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const wait = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms))
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } throw Error(label) }
  const click = async label => { await ev(`(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(e=>e.getClientRects().length);const b=[...(modal||document).querySelectorAll('button')].find(e=>e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.split(' ').join('').trim()===${JSON.stringify(label.split(' ').join('').trim())}));if(!b||b.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});b.click()})()`); await wait() }
  const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
  const shot = async name => { await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64')) }
  const login = async role => {
    await click('切换身份⌄'); await ev(`[...document.querySelectorAll('.ant-dropdown-menu-item')].find(e=>e.innerText===${JSON.stringify({teacher:'心理教师',admin:'管理员',student:'学生'}[role])}).click()`); await wait()
    await fill('#login-account',{teacher:'T-DEMO-01',admin:'A-DEMO-01',student:'S-DEMO-01'}[role]); await fill('#login-password','Demo@2026'); await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1100)
  }
  const color = selector => `getComputedStyle(document.querySelector(${JSON.stringify(selector)}))`
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:appUrl}); await wait(1000)
  await ev("for(const id of ['T-DEMO-01','A-DEMO-01','S-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  for(const theme of ['warm','blue','rose']) {
    await ev(`localStorage.setItem('campus-appearance-theme',${JSON.stringify(theme)})`)
    await call('Page.reload'); await wait(900)
    const primary = await ev(`${color('.account-submit')}.backgroundColor`)
    const canvas = 'rgb(246, 245, 243)'
    await check("document.querySelector('.account-login').dataset.palette==='clay'",theme+' original login palette retained')
    if(theme==='warm')await shot('brand-login')
    await login('teacher'); await click('约谈学生')
    await check(`${color('.tw-dialog-footer .ant-btn-primary')}.backgroundColor===${JSON.stringify(primary)}`,theme+' teacher button matches original login')
    await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500)
    await check(`${color('.tw-shell')}.backgroundColor===${JSON.stringify(canvas)}`,theme+' teacher uses restrained work background')
    if(theme==='warm')await shot('brand-teacher')
    await click('我的'); await click('退出教师账号'); await wait(600)
    await check(`${color('.account-submit')}.backgroundColor===${JSON.stringify(primary)}`,theme+' login unchanged after teacher logout')
    await login('admin')
    await check(`${color('.admin-shell-host')}.backgroundColor===${JSON.stringify(canvas)}`,theme+' admin uses restrained work background')
    await check(`${color('.admin-brandmark')}.backgroundColor===${JSON.stringify(primary)}`,theme+' admin brand mark matches original login')
    await check(`${color('.admin-sidebar .active')}.color===${JSON.stringify(primary)}`,theme+' admin selected navigation matches login')
    if(theme==='warm')await shot('brand-admin')
    await click('我的'); await click('退出管理员账号'); await click('退出登录'); await wait(600)
    await login('student')
    await check(`document.documentElement.dataset.theme===${JSON.stringify(theme)}&&localStorage.getItem('campus-appearance-theme')===${JSON.stringify(theme)}`,theme+' student theme remains intact')
  }
  console.log('Original login preserved; staff color consistency checks passed')
} finally { page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close() }