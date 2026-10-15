// Run with a dedicated Chrome debugging endpoint; each run uses an isolated context.
import { writeFile } from 'node:fs/promises'
const endpoint = process.env.TEACHER_QA_CDP || 'http://127.0.0.1:9345'
const appUrl = process.env.TEACHER_QA_URL || 'http://127.0.0.1:5206'
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
    await click('演示账号 查看'); await click('填入学生演示账号');
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check("!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  await call('Runtime.enable'); await call('Page.bringToFront'); await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2})
  await call('Page.navigate',{url:appUrl}); await wait(1200); await login('student'); await click('校园指南')


 await click('我的课表');await check("!!document.querySelector('[aria-label=导入课表图片]')",'image import input exists');await shot('timetable-empty');
 const png=await ev(`(()=>{const c=document.createElement('canvas');c.width=1800;c.height=1040;const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#9aa4ad';x.lineWidth=2;for(let i=0;i<=7;i++){x.beginPath();x.moveTo(140+i*230,24);x.lineTo(140+i*230,980);x.stroke()}for(let i=0;i<=4;i++){x.beginPath();x.moveTo(10,100+i*220);x.lineTo(1750,100+i*220);x.stroke()}x.fillStyle='#111';x.font='30px Microsoft YaHei, sans-serif';['星期一','星期二','星期三','星期四','星期五','星期六','星期日'].forEach((t,i)=>x.fillText(t,165+i*230,70));x.font='28px Arial';['1-2','3-4','5-6','7-8'].forEach((t,i)=>x.fillText(t,32,220+i*220));const items=[{d:0,r:0,n:'高等数学',w:'1-16周',room:'A305'},{d:1,r:1,n:'大学英语',w:'2-16双周',room:'B402'},{d:2,r:2,n:'计算机网络',w:'1-16周',room:'C306'},{d:4,r:3,n:'心理健康教育',w:'1-16单周',room:'E220'}];items.forEach(a=>{const px=160+a.d*230,py=145+a.r*220;x.fillStyle='#111';x.font='28px Microsoft YaHei, sans-serif';x.fillText(a.n,px,py);x.font='25px Microsoft YaHei, sans-serif';x.fillText(a.w,px,py+43);x.fillText('教师：陈老师',px,py+86);x.fillText('教室：'+a.room,px,py+129)});return c.toDataURL('image/png').split(',')[1]})()`);
 await writeFile('D:/Campus_companion/tmp/timetable-ocr-fixture.png',Buffer.from(png,'base64'));
 const document=await call('DOM.getDocument');const node=await call('DOM.querySelector',{nodeId:document.root.nodeId,selector:'input[aria-label="导入课表图片"]'});await call('DOM.setFileInputFiles',{nodeId:node.nodeId,files:['D:/Campus_companion/tmp/timetable-ocr-fixture.png']});
 for(let n=0;n<150;n++){if(await ev("!!document.querySelector('.tt-review-list')"))break;if(await ev("!!document.querySelector('.tt-error')&&!document.querySelector('.tt-recognition')"))break;await wait(500);if(n%20===0)console.log('OCR processing...')}
 await shot('timetable-ocr-preview');
 await check("document.querySelectorAll('.tt-review-list article').length===4",'OCR identifies four real fixture courses');
 await check("document.querySelector('.tt-review-list').innerText.includes('高等数学')&&document.querySelector('.tt-review-list').innerText.includes('计算机网络')",'Chinese course names recognized');
 await click('确认生成课表');await check("document.querySelector('.tt-week-bar')!==null",'review commits timetable');
 await click('周一');await check("document.querySelector('.tt-day-courses').innerText.includes('高等数学')",'today card uses imported course');await shot('timetable-today');
 await click('整周');await check("document.querySelectorAll('.tt-grid-course').length===3",'week one excludes even-week English');await shot('timetable-week');
 await click('下一教学周');await check("document.querySelector('.tt-week-grid').innerText.includes('大学英语')&&!document.querySelector('.tt-week-grid').innerText.includes('心理健康教育')",'week two applies odd/even filters');
 for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();await check("document.documentElement.scrollWidth<=innerWidth&&(()=>{const d=document.querySelector('.campus-query-pane').closest('.ant-drawer-body');return d.scrollWidth<=d.clientWidth+1})()",'timetable fits phone '+width)}
 await click('返回上一页');await click('校园指南');await click('我的课表');await check("!!document.querySelector('.tt-week-bar')",'saved timetable survives closing guide');
 await click('今日');await click('周一');await ev("document.querySelector('.tt-course-main').click()");await wait();await fill('[aria-label=课程名称]','高等数学（已校对）');await fill('[aria-label=上课周次]','16-1周');await check("[...document.querySelectorAll('.tt-editor button')].find(b=>b.textContent==='保存课程').disabled",'invalid weeks block saving');await fill('[aria-label=上课周次]','1-16周');await click('保存课程');await check("document.querySelector('.tt-day-courses').innerText.includes('高等数学（已校对）')",'course edits persist');
 const savedBefore=await ev("localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('campus-timetable-v1:')))");
 const root2=await call('DOM.getDocument');const node2=await call('DOM.querySelector',{nodeId:root2.root.nodeId,selector:'input[aria-label="导入课表图片"]'});await call('DOM.setFileInputFiles',{nodeId:node2.nodeId,files:['D:/Campus_companion/tmp/timetable-ocr-fixture.png']});await wait(100);await click('取消识别');await check("localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('campus-timetable-v1:')))==="+JSON.stringify(savedBefore),'cancelling OCR preserves saved timetable');
 await click('课表设置');await fill('[aria-label=第一周周一]','2026-09-07');await fill('[aria-label=第1节开始时间]','08:00');await fill('[aria-label=第1节结束时间]','08:45');await fill('[aria-label=第2节开始时间]','08:55');await fill('[aria-label=第2节结束时间]','09:40');await click('保存设置');await check("document.querySelector('.tt-week-bar').innerText.includes('教学周')",'semester settings save');await click('周一');await check("document.querySelector('.tt-day-courses').innerText.includes('08:00–09:40')",'school period times appear in daily card');await shot('timetable-today-configured');
 console.log('PASS full image import, editable review, week filtering, settings and cancellation flow');
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
