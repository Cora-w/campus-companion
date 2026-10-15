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

  let navigationUrl=null;
  page.ws.addEventListener('message',async event=>{const message=JSON.parse(event.data);if(message.method==='Fetch.requestPaused'){navigationUrl=message.params.request.url;await call('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<html><body>Navigation URL captured by QA</body></html>').toString('base64')})}});
  await call('Runtime.enable');await call('Page.bringToFront');await call('Fetch.enable',{patterns:[{urlPattern:'https://api.map.baidu.com/direction*'}]});
  const loadMap=async()=>{await call('Page.navigate',{url:appUrl+'/campus/sanxingdui-map.html'});await wait(800);await check("!!document.querySelector('#world .b')",'campus map loaded')};
  const selectLibrary=async()=>{await ev("(()=>{const q=document.querySelector('#q');q.value='图书馆';q.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.res').click()})()");await wait(300)};
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await loadMap();await ev('localStorage.clear()');await loadMap();await selectLibrary();
  await check("document.querySelector('#me').style.display==='none' && !localStorage.getItem('sxd-cal') && !!document.querySelector('#pNavigate') && !document.querySelector('#pNavigate').disabled",'walking navigation does not need map calibration');
  await ev("navigator.geolocation.getCurrentPosition=(ok,fail)=>fail({code:1});document.querySelector('#pNavigate').click()");await wait(300);await check("document.querySelector('.navigation-error').textContent.includes('选择校门') && !document.querySelector('#pNavigate').disabled",'denied location offers manual start and retry');
  await ev("document.querySelector('#pStart').value='gate';document.querySelector('#pStart').dispatchEvent(new Event('change',{bubbles:true}))");await shot('campus-walking-entry');
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait(200);await check("document.documentElement.scrollWidth<=innerWidth && document.querySelector('#pNavigate').getBoundingClientRect().width<=document.querySelector('#panel').clientWidth",width+' walking panel fits')}
  await ev("document.querySelector('#pNavigate').click()");await wait(700);let url=new URL(navigationUrl);if(url.searchParams.get('mode')!=='walking'||!url.searchParams.get('origin').includes('校门')||!url.searchParams.get('destination').includes('图书馆'))throw Error('Incorrect named-start route');console.log('PASS named campus start opens walking route');
  await loadMap();await selectLibrary();await ev("document.querySelector('#pStart').value='current-location';document.querySelector('#pStart').dispatchEvent(new Event('change',{bubbles:true}));navigator.geolocation.getCurrentPosition=ok=>ok({coords:{latitude:30.95,longitude:104.3,accuracy:12}});document.querySelector('#pNavigate').click()");await wait(700);url=new URL(navigationUrl);if(url.searchParams.get('coord_type')!=='wgs84'||url.searchParams.get('origin')!=='latlng:30.95,104.3|name:我的位置')throw Error('Incorrect GPS route');console.log('PASS GPS route uses raw coordinates without calibration');
  await loadMap();await selectLibrary();navigationUrl=null;await ev("document.querySelector('#pStart').value='current-location';document.querySelector('#pStart').dispatchEvent(new Event('change',{bubbles:true}));window.deliverFix=null;navigator.geolocation.getCurrentPosition=ok=>{window.deliverFix=ok};document.querySelector('#pNavigate').click();document.querySelector('#pClose').click();window.deliverFix({coords:{latitude:30.95,longitude:104.3,accuracy:12}})");await wait(500);if(navigationUrl)throw Error('Cancelled navigation opened external map');console.log('PASS closing destination cancels late navigation');
  await loadMap();await selectLibrary();await ev("document.querySelector('#pStart').value='current-location';document.querySelector('#pStart').dispatchEvent(new Event('change',{bubbles:true}));window.deliverFix=null;navigator.geolocation.getCurrentPosition=ok=>{window.deliverFix=ok};document.querySelector('#pNavigate').click();document.querySelector('#q').value='天和食堂';document.querySelector('#q').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.res').click();window.deliverFix({coords:{latitude:30.95,longitude:104.3,accuracy:12}})");await wait(300);await check("!document.querySelector('#pNavigate').disabled && document.querySelector('#panel h2').textContent==='天和食堂'",'changing destination resets pending navigation');if(navigationUrl)throw Error('Old destination opened navigation');
  console.log('Campus walking navigation checks passed');
} finally {page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
