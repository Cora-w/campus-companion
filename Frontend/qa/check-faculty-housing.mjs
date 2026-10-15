import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://127.0.0.1:9345/json/new?about:blank',{method:'PUT'})).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map(), errors = []
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails))
  if (message.id) { const promise = pending.get(message.id); pending.delete(message.id); if (message.error) promise.reject(message.error); else promise.resolve(message.result) }
})
const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) })
const ev = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
const wait = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))
const check = async (expression, label) => { if (!await ev(expression)) throw Error(label); console.log('PASS ' + label) }
const click = async text => {
  const expression = `(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(m=>m.getClientRects().length&&!m.classList.contains('ant-zoom-leave'));const buttons=[...(modal||document).querySelectorAll('button')].filter(b=>b.getClientRects().length);const b=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b||b.disabled)throw Error('Missing or disabled: '+${JSON.stringify(text)});b.click()})()`
  await ev(expression); await wait()
}
const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
const role = async value => { await click('切换身份'); await ev(`(()=>{const names={student:'学生',teacher:'心理教师',admin:'管理员'};const item=[...document.querySelectorAll('.ant-dropdown-menu-item')].find(item=>item.innerText===names[${JSON.stringify(value)}]);if(!item)throw Error('Missing role');item.click()})()`); await wait() }
const shot = async name => { await call('Page.bringToFront'); await wait(); await writeFile(`qa/screenshots/${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64')) }
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const close = async () => { await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500) }
const select = async (label, choice) => {
  await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await wait()
  await ev(`(()=>{const option=[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)});if(!option)throw Error('Missing option');option.click()})()`); await wait()
}
const appointmentAction = async (student, action) => { await ev(`(()=>{const card=[...document.querySelectorAll('.tw-appointment')].find(c=>c.innerText.includes(${JSON.stringify(student)}));const b=[...card.querySelectorAll('button')].find(b=>b.innerText.split(' ').join('').trim()===${JSON.stringify(action)});if(!b)throw Error('Missing appointment action');b.click()})()`); await wait() }
const login = async (kind,account) => { await role(kind); await select('登录学校','四川航天职业技术学院'); await fill('#login-account',account); await fill('#login-password','Demo@2026'); await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1000) }
const studentExit = async () => { await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(500) }
const closeTop = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].filter(b=>b.getClientRects().length).at(-1).click()"); await wait(500) }

const tab=async label=>{await ev("[...document.querySelectorAll('.bottom-nav button')].find(b=>b.getAttribute('aria-label')==="+JSON.stringify(label)+").click()");await wait()}
const fits=async label=>{await check('document.documentElement.scrollWidth<=innerWidth',label+' page fits');await check("(()=>{const d=[...document.querySelectorAll('.ant-drawer-open')].at(-1);if(!d)return true;const w=d.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect(),b=d.querySelector('.ant-drawer-body');return w.width<=Math.min(innerWidth,480)+1&&b.scrollWidth<=b.clientWidth+1})()",label+' overlay fits')}
const staffClose=async()=>{await ev('window.campusBack()');await wait(600)}

try {
 await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5191'});await wait(1800);
 if(await ev("!!document.querySelector('#login-account')"))await login('student','S-DEMO-01');await click('校园指南');await wait(500);
 await check("document.querySelector('.school-map-canvas').getBoundingClientRect().height>200",'map canvas has usable height');await check("!!document.querySelector('.school-map')",'school reference map replaces sample');
 await check("!document.querySelector('.room-results')",'default view does not list every address');await check("!document.querySelector('.school-map-canvas circle')",'map has no circular pins');await click('教师公寓区');const tapView=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");await check("document.querySelectorAll('[data-map-place^=faculty-]').length===16",'all 16 faculty housing pins present');
 await ev("document.querySelector('[data-map-place=faculty-14]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");await wait();
 await check("document.querySelector('.school-map-canvas').getAttribute('viewBox')==="+JSON.stringify(tapView),'selecting building preserves viewport');await check("document.body.innerText.includes('教师公寓 14 号楼')&&document.body.innerText.includes('教师公寓编号补充图')",'housing detail and source shown');
 await fill('[aria-label=搜索校园地点]','教师公寓');await check("document.querySelectorAll('.room-results button').length===3",'broad search shows only three results');await click('查看更多结果');await check("document.querySelectorAll('.room-results button').length===6",'more results shown only on request');await fill('[aria-label=搜索校园地点]','教师公寓16号');await check("document.querySelector('.room-results').innerText.includes('教师公寓 16 号楼')",'building number search ignores spaces');
 await ev("document.querySelector('.room-results button').click()");await wait();await check("document.querySelector('[data-map-place=faculty-16]').getAttribute('aria-pressed')==='true'",'search selection focuses pin');
 const before=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");await click('放大地图');await check("document.querySelector('.school-map-canvas').getAttribute('viewBox')!=="+JSON.stringify(before),'zoom changes viewport');
 const box=await ev("(()=>{const r=document.querySelector('.school-map-canvas').getBoundingClientRect();return {x:r.x+80,y:r.y+70}})()");
 const panBefore=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y,id:1}]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+35,y:box.y+8,id:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait();
 await check("document.querySelector('.school-map-canvas').getAttribute('viewBox')!=="+JSON.stringify(panBefore),'touch drag pans map without returning');
 await check("document.querySelector('[data-map-place=faculty-16]').getAttribute('aria-pressed')==='true'",'drag does not change selection');const pinchBefore=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y,id:1},{x:box.x+60,y:box.y,id:2}]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x-15,y:box.y,id:1},{x:box.x+95,y:box.y,id:2}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait();
 await check("document.querySelector('.school-map-canvas').getAttribute('viewBox')!=="+JSON.stringify(pinchBefore),'two finger pinch zooms map');
 await check("document.querySelector('[data-map-place=faculty-16]').getAttribute('aria-pressed')==='true'",'pinch does not select buildings');
 const slideBefore=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y,id:1},{x:box.x+60,y:box.y,id:2}]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+20,y:box.y+15,id:1},{x:box.x+80,y:box.y+15,id:2}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait();
 const slideAfter=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");if(slideBefore===slideAfter)throw Error('Two finger slide did not pan');if(Math.abs(Number(slideBefore.split(' ')[2])-Number(slideAfter.split(' ')[2]))>1)throw Error('Parallel fingers unexpectedly zoomed');console.log('PASS two finger slide pans without changing zoom');
 for(const w of [320,390,430]){await resize(w);await fits('campus map '+w);}
 await resize(390);await click('教师公寓区');
 const fixedView=await ev("document.querySelector('.school-map-canvas').getAttribute('viewBox')");
 for(const id of ['faculty-14','faculty-15']){
  const point=await ev("(()=>{const r=document.querySelector('[data-map-place="+id+"] rect').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait();
  await check("document.querySelector('[data-map-place="+id+"]').getAttribute('aria-pressed')==='true'",'physical touch selects '+id);
  await check("document.querySelector('.school-map-canvas').getAttribute('viewBox')==="+JSON.stringify(fixedView),'physical tap preserves view '+id);
 }
 await shot('faculty-housing-map');
 if(errors.length)throw Error(errors.join(';'));console.log('Faculty housing map UI passed');
} finally {ws.close()}

