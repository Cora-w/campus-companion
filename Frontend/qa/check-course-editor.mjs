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
  await call('Page.navigate',{url:appUrl}); await wait(1200); await login('student');

 await click('校园指南');await click('我的课表');await click('也可以手动添加课程')
 await check("!!document.querySelector('.tt-course-form')&&!document.querySelector('.tt-back')&&!document.querySelector('.tt-course-form .ant-input-number')",'grouped course editor has no back button or spinners')
 for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();await check("document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.tt-course-form .ant-input,.tt-course-form .ant-select')].every(e=>{const r=e.getBoundingClientRect();return r.width>40&&r.left>=0&&r.right<=innerWidth+1})",width+'px course fields fit')}
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait();await shot('course-editor-redesigned')
 const select=async(label,value)=>{await ev('document.querySelector('+JSON.stringify('[aria-label="'+label+'"]')+').closest(".ant-select").querySelector(".ant-select-content").dispatchEvent(new MouseEvent("mousedown",{bubbles:true}))');await wait();await ev('[...document.querySelectorAll(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option")].find(e=>e.getAttribute("title")==='+JSON.stringify(value)+').click()');await wait()}

 await fill('[aria-label=课程名称]','高等数学');await select('课程星期','周一');await select('开始节次','第 3 节')
 await check("document.querySelector('[aria-label=结束节次]').closest('.ant-select').innerText.includes('第 3 节')",'end period follows later start')
 await select('结束节次','第 4 节');await click('每周');await fill('[aria-label=课程楼栋]','知行楼');await fill('[aria-label=课程教室]','A203');await click('保存课程')
 await check("!!document.querySelector('.tt-week-bar')&&!document.querySelector('.tt-course-form')&&localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('campus-timetable-v1:'))).includes('高等数学')",'manual course saves and returns to timetable')
 await click('＋ 添加课程');await ev("document.querySelector('.tt-editor-heading').scrollIntoView({block:'center'})");await wait()
 const point=await ev("(()=>{const r=(document.querySelector('.tt-editor-heading').closest('.ant-drawer-content,.app-shell,.teacher-shell-host,.admin-shell-host')||document.documentElement).getBoundingClientRect(),h=document.querySelector('.tt-editor-heading').getBoundingClientRect();return{x:r.left+5,y:h.top+15}})()")
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:point.x,y:point.y}]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:point.x+110,y:point.y+3}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait()
 await check("!document.querySelector('.tt-course-form')&&!!document.querySelector('.tt-week-bar')",'edge swipe returns to timetable rather than closing guide')
 await click('＋ 添加课程');await ev("window.campusBack()");await wait();await check("!document.querySelector('.tt-course-form')&&!!document.querySelector('.tt-week-bar')",'system back returns to timetable')
 console.log('PASS course editor layout, selects, save, native edge swipe and system back')
}finally {page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}

