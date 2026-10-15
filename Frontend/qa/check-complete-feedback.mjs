// Run with a dedicated Chrome debugging endpoint; each run uses an isolated context.
import { writeFile } from 'node:fs/promises'
const endpoint = process.env.TEACHER_QA_CDP || 'http://127.0.0.1:9345'
const appUrl = process.env.TEACHER_QA_URL || 'http://127.0.0.1:5183'
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
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } console.log(await ev("JSON.stringify({text:document.body.innerText.slice(-400),at:[...document.elementsFromPoint(195,600)].slice(0,4).map(e=>e.className),scrolls:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50).slice(0,10).map(e=>({cls:e.className,top:e.scrollTop,h:e.clientHeight,sh:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))})")); await shot('pinch-test-failure'); throw Error(label) }
  const click = async label => { await ev(`(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(e=>e.getClientRects().length);const b=[...(modal||document).querySelectorAll('button')].find(e=>e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.split(' ').join('').trim()===${JSON.stringify(label.split(' ').join('').trim())}));if(!b||b.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});b.click()})()`); await wait() }
  const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
  const login = async role => {
    await check("!!document.querySelector('#login-account')", 'login ready')
    await click('演示账号 查看');await click(role==='teacher'?'填入心理教师演示账号':role==='admin'?'填入管理员演示账号':'填入学生演示账号')
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check("!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  await call('Runtime.enable'); await call('Page.bringToFront'); await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2})
  await call('Page.navigate',{url:appUrl}); await wait(1200); await login('admin');

  await click('反馈处理')
  await check("document.querySelectorAll('.campus-service-item').length===3&&document.querySelector('.campus-service-panel').innerText.includes('1 条待处理')",'three examples and one pending shown')

  await ev("document.querySelector('.campus-service-item button').click()");await wait();await click('取消')
  await check("document.querySelectorAll('.campus-service-item').length===3&&!document.querySelector('#campus-feedback-reply')",'cancel keeps feedback and row action does not open detail')
  await ev("document.querySelector('.campus-service-item button').click()");await wait();await click('已处理并删除')
  await check("document.querySelectorAll('.campus-service-item').length===2&&document.querySelector('.campus-service-panel').innerText.includes('0 条待处理')&&!document.querySelector('.campus-service-panel').innerText.includes('插座松动')",'done removes pending feedback and updates count')
  await shot('feedback-completed-list')
  await ev("document.querySelector('.campus-service-item').click()");await wait();await click('已处理');await click('已处理并删除')
  await check("document.querySelectorAll('.campus-service-item').length===1&&!document.querySelector('#campus-feedback-reply')",'detail completion deletes feedback and closes detail')
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();await check("document.documentElement.scrollWidth<=innerWidth",width+'px done action fits')}
  await ev("document.querySelector('.campus-service-item button').click()");await wait();await click('已处理并删除')
  await check("!document.querySelector('.campus-service-item')&&document.querySelector('.campus-service-panel').innerText.includes('暂无匹配的反馈')",'replied feedback removed and empty state shown')
  await ev("window.campusBack()");await wait(600);await click('我的');await click('打开设置');await click('退出当前身份');await click('确认退出');await wait(600);await login('student');await click('我的');await click('帮助与反馈');await click('提出建议或反馈问题')
  await check("!document.querySelector('.profile-feedback-item')",'completed feedback also removed from student records')
  console.log('PASS feedback completion confirmation, cancellation, all statuses, counters, empty state and student removal')
}finally {page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
