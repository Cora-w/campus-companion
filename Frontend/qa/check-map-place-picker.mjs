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
  await inside("(()=>{const q=document.querySelector('#q');q.value='图书馆';q.dispatchEvent(new window.Event('input',{bubbles:true}));document.querySelector('.res').click();return true})()");await wait(650)
  if(!await inside("getComputedStyle(document.querySelector('#pStart')).display==='none'&&!!document.querySelector('.map-select-trigger[data-for=\"pStart\"]')"))throw Error('Native dropdown still visible')
  await inside("(()=>{document.querySelector('.map-select-trigger[data-for=\"pStart\"]').click();return true})()")
  if(!await inside("!document.querySelector('.place-picker').hidden&&!!document.querySelector('.place-picker-option[aria-selected=\"true\"]')"))throw Error('Picker not open or selection missing')
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();if(!await inside("(()=>{const r=document.querySelector('.place-picker-sheet').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&document.querySelector('.place-picker-list').scrollHeight>document.querySelector('.place-picker-list').clientHeight})()"))throw Error('Picker layout '+width);console.log('PASS bounded warm picker '+width+'px');if(width===390)await shot('campus-map-place-picker')}
  await inside("(()=>{const e=document.querySelector('.place-picker-search');e.value='明志';e.dispatchEvent(new window.Event('input',{bubbles:true}));return true})()")
  if(!await inside("document.querySelectorAll('.place-picker-option').length===1"))throw Error('Search failed')
  await inside("(()=>{document.querySelector('.place-picker-option').click();return true})()")
  if(!await inside("document.querySelector('.place-picker').hidden&&document.querySelector('.map-select-trigger[data-for=\"pStart\"]').innerText.includes('明志楼')&&document.querySelector('#pStart').value!=='current-location'"))throw Error('Selection did not update route origin')
  console.log('PASS location search and navigation origin selection')
  await inside("(()=>{document.querySelector('.map-select-trigger[data-for=\"pStart\"]').click();const e=document.querySelector('.place-picker-search');e.value='不存在的地方';e.dispatchEvent(new window.Event('input',{bubbles:true}));return true})()")
  if(!await inside("!!document.querySelector('.place-picker-empty')"))throw Error('Missing empty result')
  await inside("(()=>{document.querySelector('.place-picker .x').click();document.querySelector('#pClose').click();window.navigator.geolocation.watchPosition=(success,error)=>{error({code:1});return 123};document.querySelector('#calBtn').click();document.querySelector('.map-select-trigger[data-for=\"calSel\"]').click();return true})()")
  if(!await inside("!document.querySelector('.place-picker').hidden&&document.querySelectorAll('.place-picker-option').length===13"))throw Error('Calibration selector unavailable')
  console.log('PASS empty result and calibration landmark picker')
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}