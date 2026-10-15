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
  await check("document.querySelector('iframe').allow==='geolocation'",'map can request device location')
  if(!await inside("['q','chips','locBtn','calBtn','manualBtn','calRec','calClear','theme','scale'].every(id=>document.getElementById(id))"))throw Error('Original controls missing')
  await inside("(()=>{const q=document.querySelector('#q');q.value='财务处';q.dispatchEvent(new window.Event('input',{bubbles:true}));document.querySelector('.res').click();return true})()")
  await wait(600)
  if(!await inside("document.querySelector('#panel').innerText.includes('财务处')&&document.querySelector('#panel').innerText.includes('201')"))throw Error('Office details missing')
  await shot('campus-original-details')
  await inside("(()=>{document.querySelector('#pClose').click();window.navigator.geolocation.watchPosition=(success,error)=>{error({code:1});return 123};document.querySelector('#calBtn').click();return true})()")
  if(!await inside("document.querySelector('#modal').classList.contains('on')&&document.querySelector('#calSel').options.length===13"))throw Error('Full calibration missing')
  await inside("(()=>{document.querySelector('#manualBtn').click();return true})()")
  await ev("document.querySelector('iframe').scrollIntoView({block:'center'})");await wait()
  const point=await ev("(()=>{const r=document.querySelector('iframe').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.45}})()")
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:point.x,y:point.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait()
  if(!await inside("window.localStorage.getItem('sxd-manual')!==null&&document.querySelector('#me').style.display!=='none'"))throw Error('Manual location unavailable')
  await inside("(()=>{const q=document.querySelector('#q');q.value='图书馆';q.dispatchEvent(new window.Event('input',{bubbles:true}));document.querySelector('.res').click();return true})()")
  await wait(600)
  if(!await inside("!!document.querySelector('#pRoute')&&!!document.querySelector('#pHere')"))throw Error('Original place actions missing')
  await inside("(()=>{document.querySelector('#theme').click();return true})()")
  if(!await inside("!!document.documentElement.dataset.theme"))throw Error('Theme unavailable')
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();if(!await inside("document.documentElement.scrollWidth<=window.innerWidth"))throw Error('Map overflow '+width)}
  for(const [width,height] of [[320,640],[390,844],[430,932],[1209,686]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await wait()
    await check("(()=>{const f=document.querySelector('.campus-original-map');const b=f.closest('.ant-drawer-body');const r=f.getBoundingClientRect();const bounds=b.getBoundingClientRect();const bottom=bounds.bottom-parseFloat(getComputedStyle(b).paddingBottom);return document.querySelector('.campus-map-drawer')&&Math.abs(r.bottom-bottom)<2&&r.height>300&&b.scrollHeight<=b.clientHeight+1&&getComputedStyle(b).overflowY==='hidden'&&r.bottom<=b.getBoundingClientRect().bottom&&r.height>100})()",'map fills remaining viewport without scroll '+width+'x'+height)
  }
  await inside("(()=>{document.documentElement.dataset.theme='light';return true})()")
  if(!await inside("getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()==='#f5f0e8'"))throw Error('Warm map surface missing')
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait()
  await inside("(()=>{document.querySelector('#pClose')?.click();document.querySelector('#calClose')?.click();document.querySelector('#fit').click();return true})()");await wait();await shot('campus-map-warm-fit')
  await call('Emulation.setDeviceMetricsOverride',{width:1209,height:763,deviceScaleFactor:1,mobile:false});await wait();await shot('campus-map-desktop-filled')
  await click('我的课表');await check("!!document.querySelector('[aria-label=\"导入课表图片\"]')&&getComputedStyle(document.querySelector('.campus-query-pane').closest('.ant-drawer-body')).overflowY!=='hidden'",'timetable keeps normal page scrolling')
  await click('校园通知');await check("document.querySelector('.campus-query-pane').hidden&&getComputedStyle(document.querySelector('.campus-query-pane').closest('.ant-drawer-body')).overflowY!=='hidden'",'notices keep normal page scrolling')
  console.log('PASS original search, details, GPS permission delegation, complete calibration, manual location, original place actions, theme and mobile widths')
} finally {page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}

