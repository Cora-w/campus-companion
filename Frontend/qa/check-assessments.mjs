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
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } console.log(await ev("JSON.stringify({text:document.body.innerText.slice(-400),at:[...document.elementsFromPoint(195,600)].slice(0,4).map(e=>e.className),scrolls:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50).slice(0,10).map(e=>({cls:e.className,top:e.scrollTop,h:e.clientHeight,sh:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))})")); throw Error(label) }
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


  await call('Runtime.enable');await call('Page.bringToFront');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url:appUrl});await wait(1500);await login('student');await click('倾诉空间');
  await check("[...document.querySelectorAll('.ls-shortcuts button')].map(b=>b.textContent).join('|')==='心理测试|性格测试|找人聊聊'",'original three capsules with distinct actions');
  for(const width of [320,390,430]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();
    await check("(()=>{const b=[...document.querySelectorAll('.ls-shortcuts button')];return b.every(e=>Math.abs(e.getBoundingClientRect().top-b[0].getBoundingClientRect().top)<1&&e.scrollWidth<=e.clientWidth+1)&&b.every(e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth)})()",'capsules fit '+width);
  }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait();await shot('assessment-entry');
  const assessmentClick=async text=>{await ev('(()=>{const root=document.querySelector(".assessment-root");const b=[...root.querySelectorAll("button")].find(b=>b.textContent.split(" ").join("").trim()==='+JSON.stringify(text)+');if(!b||b.disabled)throw Error("Missing/disabled assessment button "+'+JSON.stringify(text)+');b.click()})()');await wait(100)};
  const choose=async index=>{await ev('document.querySelectorAll(".assessment-choices input")['+index+'].click()');await wait(60)};
  const closeTest=async()=>{await ev('document.querySelector(".assessment-root .ant-drawer-close").click()');await wait()};
  const fits=async label=>{await check("(()=>{const r=document.querySelector('.assessment-root');const w=r.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect();const f=r.querySelector('.assessment-actions').getBoundingClientRect();const s=r.querySelector('.assessment-scroll');return Math.abs(w.width-Math.min(innerWidth,480))<=1&&w.left>=0&&w.right<=innerWidth+1&&f.bottom<=innerHeight+1&&s.scrollWidth<=s.clientWidth+1&&s.getBoundingClientRect().bottom<=f.top+1})()",label)};
  await click('心理测试');await check("document.querySelector('.assessment-actions button').disabled&&document.querySelector('.assessment-facts').innerText.includes('16')",'16-item informed start gate');await shot('assessment-mental-intro');
  await ev('document.querySelector(".assessment-intro input").click()');await assessmentClick('开始测试');
  await check("document.querySelector('.assessment-actions button:last-child').disabled",'unanswered question blocks next');
  await choose(3);await assessmentClick('下一题');await choose(3);await assessmentClick('上一题');
  await check("document.querySelectorAll('.assessment-choices input')[3].checked",'back preserves selected answer');
  await closeTest();await check("(()=>{const m=document.querySelector('.ant-modal');if(!m)return false;const b=[...m.querySelectorAll('button')].find(e=>e.textContent.includes('继续'));const r=b.getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('.ant-modal')})()",'exit confirmation appears above drawer and accepts physical taps');await click('继续答题');
  await check("!!document.querySelector('.assessment-questions')",'cancel exit preserves answers');
  for(let i=0;i<16;i++){await choose(3);if(i===8)await check("!!document.querySelector('.assessment-safety')",'item 9 support prompt appears before completion');await assessmentClick(i===15?'查看结果':'下一题')}
  await check("document.querySelectorAll('.assessment-mental-scores article').length===2&&document.querySelectorAll('.assessment-mental-scores strong')[0].textContent.includes('27')&&document.querySelectorAll('.assessment-mental-scores strong')[1].textContent.includes('21')",'16 answers scored as independent PHQ-9 and GAD-7');await shot('assessment-mental-result');
  await assessmentClick('找人聊聊');await check("!!document.querySelector('#ls-support-text')&&!document.querySelector('.assessment-root')&&!document.querySelector('#ls-support-text').value",'support does not automatically share answers');
  await ev("document.querySelector('.ls-panel-root .ant-drawer-close').click()");await wait();
  await click('心理测试');await check("!!document.querySelector('.assessment-intro')&&!document.querySelector('.assessment-questions')",'reopening clears prior answers');await closeTest();
  await click('性格测试');await check("document.querySelector('.assessment-facts').innerText.includes('50')",'50-item personality introduction');await ev('document.querySelector(".assessment-intro input").click()');await assessmentClick('开始测试');
  for(const width of [320,390,430,1209]){await call('Emulation.setDeviceMetricsOverride',{width,height:640,deviceScaleFactor:1,mobile:true});await wait();await fits('questions fit short viewport '+width)}
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait();await shot('assessment-personality-question');
  await choose(2);await assessmentClick('答题卡');await check("document.querySelectorAll('.assessment-overview button').length===50",'overview contains every question');
  await ev("document.querySelectorAll('.assessment-overview button')[49].click()");await wait();await choose(2);await assessmentClick('补全未答题');
  await check("document.querySelector('.assessment-progress-copy b').textContent.trim().startsWith('2')",'last question sends user to first missing answer');
  for(let i=1;i<50;i++){await choose(2);await assessmentClick(i===49?'查看结果':'下一题')}
  await check("document.querySelectorAll('.assessment-traits article').length===5&&[...document.querySelectorAll('.assessment-traits [role=meter]')].every(e=>e.getAttribute('aria-valuenow')==='3')",'50 answers produce five correctly scored traits');await shot('assessment-personality-result');
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:640,deviceScaleFactor:1,mobile:true});await wait();await fits('result fits short viewport '+width);await ev("document.querySelector('.assessment-scroll').scrollTop=10000");await wait();await check("document.querySelector('.assessment-scroll').scrollTop>0",'full result remains scrollable '+width)}
  await assessmentClick('修改答案');await check("document.querySelectorAll('.assessment-choices input')[2].checked",'result edit preserves all answers');await closeTest();await click('退出并清空');
  await check("!!document.querySelector('.ls-entry')&&!document.querySelector('.assessment-root')",'return to entry after confirmed exit');
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
