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
    await click('切换身份⌄')
    await ev(`[...document.querySelectorAll('.ant-dropdown-menu-item')].find(e=>e.innerText===${JSON.stringify(role === 'teacher' ? '心理教师' : role === 'admin' ? '管理员' : '学生')}).click()`); await wait()
    await click('演示账号 查看'); await click('填入演示账号');
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check("!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  const pinch = async label => {
    for(const scaleFactor of [.65,1.5]) {
      await call('Input.synthesizePinchGesture',{x:195,y:350,scaleFactor,relativeSpeed:500,gestureSourceType:'touch'}); await wait(200)
      await check('Math.abs(visualViewport.scale-1)<.01&&document.documentElement.scrollWidth<=innerWidth',label+' native pinch '+scaleFactor+' keeps page size')
    }
    await check(`(()=>{const e=document.querySelector('.ant-modal-body')||document.querySelector('.ant-drawer-open .ant-drawer-body')||document.querySelector('main')||document.body;const t=new Touch({identifier:1,target:e,clientX:100,clientY:300});const u=new Touch({identifier:2,target:e,clientX:200,clientY:300});return ['touchstart','touchmove'].every(type=>{const ev=new TouchEvent(type,{bubbles:true,cancelable:true,touches:[t,u]});e.dispatchEvent(ev);return ev.defaultPrevented})})()`,label+' cancels multi-touch browser defaults')
  }
  await call('Page.bringToFront'); await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2})
  page.ws.addEventListener('message', async event=>{const message=JSON.parse(event.data);if(message.method==='Fetch.requestPaused')await call('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/svg+xml'}],body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#d0aa88"/></svg>').toString('base64')})})
  await call('Fetch.enable',{patterns:[{urlPattern:'*',resourceType:'Image'}]})
  await call('Page.navigate',{url:appUrl}); await wait(1500)
  await ev("for(const id of ['S-DEMO-01','T-DEMO-01','A-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await pinch('login')
  await check(`(()=>{const e=document.querySelector('#login-account');return ['gesturestart','gesturechange','gestureend'].every(type=>{const event=new Event(type,{bubbles:true,cancelable:true});e.dispatchEvent(event);return event.defaultPrevented})})()`,'Safari gesture event defaults canceled')
  await check(`(()=>{const e=document.body;const touch=new Touch({identifier:1,target:e,clientX:100,clientY:300});const event=new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch]});e.dispatchEvent(event);return !event.defaultPrevented})()`,'single-touch defaults preserved')
  await login('student')
  const before=await ev('scrollY+[...document.querySelectorAll("*")].reduce((n,e)=>n+e.scrollTop,0)'); await call('Page.bringToFront'); await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:195,y:650}]}); for(let y=600;y>=300;y-=50) {await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:195,y}]}); await wait(40)} await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await wait(); await check(`scrollY+[...document.querySelectorAll("*")].reduce((n,e)=>n+e.scrollTop,0)>${before}`,'ordinary page single-finger scroll works')
  for(const label of ['首页','发现','发布','消息','我的']) { await click(label); await pinch('student '+label) }
  await click('我的约谈'); await pinch('student invitation drawer'); await close()
  await click('编辑资料'); await pinch('student edit form drawer'); await ev("document.querySelector('.profile-editor input:not([type=file])').focus()"); await check('Math.abs(visualViewport.scale-1)<.01','input focus keeps page scale'); await close()
  await click('发现'); await wait(600); await ev("document.querySelector('.discover-cover .discover-photo-trigger').click()"); await wait(800)
  await check("!!document.querySelector('.ant-image-preview-img')&&document.querySelector('.ant-image-preview-img').naturalWidth>0",'image preview loaded')
  const rect=await ev("(()=>{const r=document.querySelector('.ant-image-preview-img').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
  const points=distance=>[{id:1,x:rect.x-distance,y:rect.y},{id:2,x:rect.x+distance,y:rect.y}]
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(35)}); await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(70)}); await wait()
  await check("document.querySelector('.ant-image-preview-img').style.transform.includes('scale3d(2')",'image two-finger zoom grows image')
  await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(45)}); await wait()
  await check("(()=>{const scale=Number(document.querySelector('.ant-image-preview-img').style.transform.split('scale3d(')[1]?.split(',')[0]);return scale>1&&scale<2&&Math.abs(visualViewport.scale-1)<.01})()",'image pinch shrinks only image, not page')
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await ev("document.querySelector('.ant-image-preview-close').click()"); await wait(500); await pinch('page after image preview')
  for(const role of ['teacher','admin']) {
    await call('Page.reload'); await wait(1100); await login(role)
    await click('我的')
    const labels=await ev("[...document.querySelectorAll('.profile-staff-menu button')].map(b=>b.getAttribute('aria-label'))")
    await check(`document.querySelectorAll('.profile-staff-menu button').length>0`,role+' workspaces available')
    for(const label of labels) { await click(label); await pinch(role+' '+label); await close() }
    if(role==='teacher'){await click('学生支持档案');await ev("document.querySelector('.tw-student-card').click()");await wait(500);await pinch('teacher student detail');await close();await close()}
    else {await click('账号管理');await ev("document.querySelector('[data-account-id=\"T-DEMO-01\"] ').click()"); await wait();await click('编辑陈老师'); await pinch('admin account editor');await fill('#admin-account-name','修改草稿');await close();await pinch('admin confirmation modal');await click('继续填写')}
  }
  console.log('App-wide native pinch prevention, scrolling and image pinch checks passed')
} finally {
  page?.ws.close()
  await browser.call('Target.disposeBrowserContext',{browserContextId})
  browser.ws.close()
}