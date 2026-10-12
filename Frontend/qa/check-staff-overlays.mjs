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
  const close=async()=>{await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()");await wait(600)}
  await call('Emulation.setDeviceMetricsOverride',{width:1200,height:844,deviceScaleFactor:1,mobile:false})
  await call('Page.navigate',{url:appUrl});await wait(1000);await ev("localStorage.setItem('campus-school-v1:A-DEMO-01','sichuan-aerospace-polytechnic')");await login('admin')
  await ev("document.querySelector('[data-account-id=\"T-DEMO-01\"]').click()");await wait()
  await check("(()=>{const r=document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper').getBoundingClientRect();return r.width===480&&r.left===360})()",'admin details centered on desktop phone surface')
  await click('编辑陈老师');await check("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-content-wrapper')].every(e=>e.getBoundingClientRect().left===360)",'nested account editor uses same phone surface')
  await close();await check("!!document.querySelector('.ant-drawer-open .staff-detail-fields')&&!document.querySelector('#admin-account-name')",'editor back returns to details')
  await close();await click('开店授权');await click('返回上一页');await check("document.querySelector('.admin-heading h1').textContent==='账号管理'",'admin page arrow returns to previous page')
  console.log('Staff overlay checks passed')
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}