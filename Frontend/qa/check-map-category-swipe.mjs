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

  await check("!!document.querySelector('iframe.campus-original-map')?.contentDocument?.querySelector('#world .b')",'original map loads in campus guide')
  const inside = expression => ev('(function(){const w=globalThis.document.querySelector("iframe.campus-original-map").contentWindow;const document=w.document;const window=w;return ('+expression+')})()')
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();if(!await inside("(()=>{const buttons=[...document.querySelectorAll('.chip')];const top=buttons[0].getBoundingClientRect().top;return buttons.every(b=>Math.abs(b.getBoundingClientRect().top-top)<1)&&document.querySelector('#chips').scrollWidth>document.querySelector('#chips').clientWidth})()"))throw Error('Not a single scrolling row '+width);console.log('PASS single row '+width+'px')}
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait()
  const box=await ev("(()=>{const f=document.querySelector('iframe');const r=f.getBoundingClientRect();const c=f.contentDocument.querySelector('#chips').getBoundingClientRect();return {left:r.left+c.left,right:r.left+c.right,y:r.top+c.top+c.height/2}})()")
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:box.right-45,y:box.y,button:'left',clickCount:1})
  for(let i=1;i<=12;i++){await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.right-45-(box.right-box.left-70)*i/12,y:box.y,button:'left',buttons:1});await wait(20)}
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.left+25,y:box.y,button:'left',clickCount:1});await wait()
  if(!await inside("document.querySelector('#chips').scrollLeft>40&&document.querySelector('.chip[data-c=\"\"]').getAttribute('aria-pressed')==='true'"))throw Error('Mouse drag failed or accidentally filtered')
  console.log('PASS mouse drag scrolls without selecting a category')
  await inside("(()=>{document.querySelector('#chips').scrollLeft=0;return true})()");await wait()
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.right-45,y:box.y}]})
  for(let i=1;i<=12;i++){await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:box.right-45-(box.right-box.left-70)*i/12,y:box.y}]});await wait(25)}
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(700)
  if(!await inside("document.querySelector('#chips').scrollLeft>40"))throw Error('Touch swipe failed')
  console.log('PASS finger swipe scrolls categories')
  await inside("(()=>{document.querySelector('#chips').scrollLeft=0;document.querySelector('#chipsNext').click();return true})()");await wait(700)
  if(!await inside("document.querySelector('#chips').scrollLeft>40"))throw Error('More button failed')
  await inside("(()=>{const chips=document.querySelector('#chips');chips.scrollLeft=chips.scrollWidth;document.querySelector('.chip[data-c=\"life\"]').click();return true})()");await wait(700)
  if(!await inside("(()=>{const b=document.querySelector('.chip[data-c=\"life\"]');const c=document.querySelector('#chips').getBoundingClientRect();const r=b.getBoundingClientRect();return r.left>=c.left&&r.right<=c.right&&b.getAttribute('aria-pressed')==='true'&&document.querySelector('#chipsNext').hidden})()"))throw Error('Last category hidden or unselectable')
  console.log('PASS more button and last category selection');await shot('campus-map-categories-swipe')
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}