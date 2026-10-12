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
  const login = async role => {
    await check("!!document.querySelector('#login-account')", 'login ready')
    await click('切换身份⌄')
    await ev(`[...document.querySelectorAll('.ant-dropdown-menu-item')].find(e=>e.innerText===${JSON.stringify(role === 'teacher' ? '心理教师' : '学生')}).click()`); await wait()
    await fill('#login-account', role === 'teacher' ? 'T-DEMO-01' : 'S-DEMO-01'); await fill('#login-password', 'Demo@2026')
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check(role === 'teacher' ? "!!document.querySelector('.tw-shell')" : "!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:appUrl}); await wait(1500)
  await ev("for(const id of ['S-DEMO-01','T-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await login('student'); await click('消息'); await check("!document.querySelector('.student-invitations')&&!document.querySelector('.mobile-header .invitation-count')",'message page has no invitation card or badge'); await click('服务消息'); await check("!document.querySelector('.student-invitations')",'service messages have no invitation'); await close(); await click('我的'); await check("document.querySelector('[aria-label=我的约谈]').innerText.includes('1 条待回应')",'student starts with one example invitation')
  await click('我的约谈'); await check("document.querySelector('[data-invitation-id=APT-STUDENT-EXAMPLE]').innerText.includes('示例邀请')",'example is visible and clearly labelled'); await shot('website-default-invitation')
  await click('接受邀请'); await check("document.querySelector('[data-invitation-id=APT-STUDENT-EXAMPLE]').innerText.includes('已接受')",'default invitation can be accepted')
  await call('Page.reload'); await wait(1300); await login('student'); await click('我的'); await click('我的约谈'); await check("document.querySelector('[data-invitation-id=APT-STUDENT-EXAMPLE]').innerText.includes('已接受')",'response survives page refresh')
  await studentLogout(); await login('teacher'); await click('日程');
  const tomorrow=await ev("new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(Date.now()+86400000))")
  await fill('[aria-label="日程日期"]',tomorrow); await check("document.querySelector('.tw-schedule-list').innerText.includes('已接受')",'teacher sees student response after refresh')
  console.log('Default student invitation and persistence passed')
} finally {
  page?.ws.close()
  await browser.call('Target.disposeBrowserContext',{browserContextId})
  browser.ws.close()
}