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
    await click('切换身份')
    await ev(`[...document.querySelectorAll('.ant-dropdown-menu-item')].find(e=>e.innerText===${JSON.stringify(role === 'teacher' ? '心理教师' : role === 'admin' ? '管理员' : '学生')}).click()`); await wait()
    await click('演示账号 查看'); await click('填入演示账号');
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check("!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  await call('Runtime.enable'); await call('Page.bringToFront'); await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2})
  await call('Page.navigate',{url:appUrl}); await wait(1200); await login('student'); await click('校园指南')
  await check("!!document.querySelector('.school-map')&&!!document.querySelector('.campus-navigation')",'map and navigation panel are available without selection')
  await shot('campus-reference-full-map')
  const view=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')")
  await ev("document.querySelector('.school-map-canvas').scrollIntoView({block:'center'})"); await wait()
  const point=await ev("(()=>{const r=document.querySelector('.school-map-canvas').getBoundingClientRect();return {x:r.left+(711-380)/1620*r.width,y:r.top+(1127.5-300)/1400*r.height}})()")
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:point.x,y:point.y}]}); await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await wait()
  await check("document.querySelector('.school-map-place-panel')?.innerText.includes('图书馆')&&document.querySelector('.school-map-place-panel').innerText.includes('借阅、自习')",'physical map tap opens place description')
  await check(`document.querySelector('.school-map-canvas').getAttribute('viewBox')===${JSON.stringify(view)}`,'map tap leaves camera in place')
  await ev("document.querySelector('.school-map-place-panel summary').click()"); await shot('campus-map-place-panel')
  await click('去这里 · 导航'); await check("!document.querySelector('.school-map-place-panel')&&document.querySelector('.campus-navigation').innerText.includes('图书馆')",'go here activates navigation destination')
  await click('显示地点方向'); await check("!!document.querySelector('[data-campus-route]')&&document.querySelector('.campus-route-summary').innerText.includes('校门 → 图书馆')",'source map bearing displayed without invented road instructions')
  await check("(()=>{const u=new URL(document.querySelector('.campus-external-navigation').href);return u.searchParams.get('mode')==='walking'&&u.searchParams.get('destination').includes('三星堆校区 图书馆')})()",'external walking navigation points at selected building')
  await shot('campus-map-navigation')
  await click('隐藏方向连线'); await check("!document.querySelector('[data-campus-route]')",'route can be cleared')
  await ev("document.querySelector('[data-map-place=construction]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"); await wait()
  await check("document.querySelector('.school-map-go').disabled&&[...document.querySelectorAll('.campus-navigation button')].find(b=>b.innerText==='显示地点方向').disabled&&!document.querySelector('.campus-external-navigation')",'construction region can be inspected but cannot be navigated to')
  await click('关闭地点详情'); await fill('[aria-label="搜索校园地点"]','财务处'); await ev("document.querySelector('.room-results button').click()"); await wait()
  await check("document.querySelector('.school-map-place-panel')?.innerText.includes('致远楼')&&document.querySelector('.school-map-place-panel').innerText.includes('201')",'office search opens matching building details')
  for(const width of [320,390,430]) {await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();await check("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.ant-drawer-open .ant-drawer-body').scrollWidth<=document.querySelector('.ant-drawer-open .ant-drawer-body').clientWidth+1",width+'px map detail and navigation fit')}
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await ev("document.querySelector('[aria-label=导航起点]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))"); await wait(); await ev("document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title=\"我的位置（地图步行导航）\"]').click()"); await wait()
  await ev("navigator.geolocation.getCurrentPosition=(success,error)=>error({code:1})"); await click('定位并打开步行导航'); await check("document.querySelector('.campus-navigation').innerText.includes('未获得定位许可')",'location denial leaves manual navigation available')
  const mapRect=await ev("(()=>{document.querySelector('.school-map-canvas').scrollIntoView({block:'center'});const r=document.querySelector('.school-map-canvas').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/4}})()")
  const beforeZoom=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox').split(' ')[2]")
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:mapRect.x-30,y:mapRect.y},{id:2,x:mapRect.x+30,y:mapRect.y}]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:mapRect.x-60,y:mapRect.y},{id:2,x:mapRect.x+60,y:mapRect.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait()
  await check(`Number(document.querySelector('.school-map-canvas').getAttribute('viewBox').split(' ')[2])<${Number(beforeZoom)}&&Math.abs(visualViewport.scale-1)<.01`,'map pinch changes only map, not page')
  console.log('Map place panels, campus routes, external navigation and mobile interactions passed')
} finally {
  page?.ws.close()
  await browser.call('Target.disposeBrowserContext',{browserContextId})
  browser.ws.close()
}