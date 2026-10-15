import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://[::1]:9351/json/new?about:blank',{method:'PUT'})).json()
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
const role = async value => { await click('切换身份⌄'); await ev(`(()=>{const names={student:'学生',teacher:'心理教师',admin:'管理员'};const item=[...document.querySelectorAll('.ant-dropdown-menu-item')].find(item=>item.innerText===names[${JSON.stringify(value)}]);if(!item)throw Error('Missing role');item.click()})()`); await wait() }
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
await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.bringToFront');await call('Page.navigate',{url:'http://127.0.0.1:5191'});await wait(1500);
await ev("localStorage.clear();localStorage.setItem('campus-school-v1:S-DEMO-01','sichuan-aerospace-polytechnic')");await call('Page.reload');await wait(800);await login('student','S-DEMO-01');await tab('发现');await click('好玩');await click('查看校园摄影展');await wait(1200);
await ev(`window.carouselChanges=[];window.carouselObserver=new MutationObserver(()=>{const c=document.querySelector('.place-photo-count');const value=c?.textContent;if(value&&window.carouselChanges.at(-1)!==value)window.carouselChanges.push(value)});window.carouselObserver.observe(document.querySelector('.place-community-carousel'),{childList:true,subtree:true,characterData:true});`);
await click('下一张地点照片');await click('下一张地点照片');await wait(4000);
console.log('COUNTS',await ev('window.carouselChanges'));console.log('CURRENT',await ev("document.querySelector('.place-photo-count').textContent"));
await check("window.carouselChanges.length===1 && document.querySelector('.place-photo-count').textContent==='2 / 3'",'second and third slides settle without repeated switching');

const active=()=>ev("({count:document.querySelector('.place-photo-count').textContent,index:Number(document.querySelector('.place-community-carousel .slick-current').dataset.index),transform:document.querySelector('.place-community-carousel .slick-track').style.transform})");
for(const width of [320,390,430]){
await resize(width);await wait(700);
for(const [button,number] of [['下一张地点照片',3],['下一张地点照片',1],['上一张地点照片',3],['上一张地点照片',2],['下一张地点照片',3],['上一张地点照片',2]]){
await click(button);await wait(400);await check("document.querySelector('.place-photo-count').textContent==='"+number+" / 3' && Number(document.querySelector('.place-community-carousel .slick-current').dataset.index)==="+(number-1),width+' arrow and displayed photo agree '+number);
const state=await active();await wait(700);await check(JSON.stringify(await active())===JSON.stringify(state)?'true':'false',width+' settled slide remains stable');
}
await fits(width+' photo community');
}
await ev("document.querySelector('.place-community-carousel .slick-list').scrollIntoView({block:'center'})");await wait(300);
const swipe=async selector=>{const rect=await ev("(()=>{const r=document.querySelector("+JSON.stringify(selector)+").getBoundingClientRect();return {x:r.left+Math.min(300,r.width-40),y:r.top+80}})()");await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});for(let step=1;step<=6;step++){await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x-180*step/6,y:rect.y}]});await wait(30)}await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(800)};
await swipe('.place-community-carousel .slick-list');await check("document.querySelector('.place-photo-count').textContent==='3 / 3' && !document.querySelector('.post-detail')",'touch swipe switches one photo without opening source');
await ev("for(let i=0;i<12;i++)document.querySelector('.place-photo-next').click()");await wait(1500);await check("document.querySelector('.place-photo-count').textContent==='1 / 3'",'rapid arrow burst cannot stack animations');const stopped=await active();await wait(1800);await check(JSON.stringify(await active())===JSON.stringify(stopped)?'true':'false','burst remains settled');
await ev("document.querySelector('.place-community-carousel .slick-dots li:nth-child(3) button').click()");await wait(800);await check("document.querySelector('.place-photo-count').textContent==='3 / 3'",'dot navigation');
await click('最新');await wait(800);await check("document.querySelector('.place-photo-count').textContent==='3 / 3'",'feed sort preserves carousel');
await ev("document.querySelector('.place-community-carousel .slick-current button').click()");await wait(600);await check("!!document.querySelector('.post-detail')",'selected photo opens source');await ev('window.campusBack()');await wait(800);await check("document.querySelector('.place-photo-count').textContent==='3 / 3' && document.querySelector('.place-community-carousel .slick-current').dataset.index==='2'",'return restores selected photo once');
await closeTop();await tab('首页');await ev("[...document.querySelectorAll('.wall-post')].find(p=>p.textContent.includes('六张照片')).classList.add('album-fixture')");
const albumCount=()=>ev("document.querySelector('.album-fixture .photo-album-controls span').textContent");
for(let i=1;i<=5;i++){await ev("document.querySelector('.album-fixture [aria-label=下一张照片]').click()");await wait(700);await check("document.querySelector('.album-fixture .photo-album-controls span').textContent==='"+(i+1)+" / 6'",'shared post album next '+(i+1));}
await check("document.querySelector('.album-fixture [aria-label=下一张照片]').disabled",'last photo bounded');
await ev("document.querySelector('.album-fixture .slick-current .photo-album-slide').focus()");await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await wait(800);console.log('FOCUSED KEYBOARD',await albumCount());await check("document.querySelector('.album-fixture .photo-album-controls span').textContent==='5 / 6'",'focused photo keyboard changes once');await ev("document.querySelector('.album-fixture [aria-label=下一张照片]').click()");await wait(800);

await ev("document.querySelector('.album-fixture .slick-current .photo-album-slide').click()");await wait(600);await check("!!document.querySelector('.ant-image-preview')",'full photo preview opens');
await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37,nativeVirtualKeyCode:37});await wait(700);await ev('window.campusBack()');await wait(600);await check("document.querySelector('.album-fixture .photo-album-controls span').textContent==='5 / 6'",'preview navigation synchronizes album without feedback');
const count=await albumCount();await wait(1800);await check(await albumCount()===count?'true':'false','album remains stable after preview closes');
await ev("document.querySelector('.album-fixture [aria-label=上一张照片]').click()");await wait(700);await check("document.querySelector('.album-fixture .photo-album-controls span').textContent==='4 / 6'",'album navigation works after preview');
await ev("document.querySelector('.hot-post-controls button').click()");await wait(700);await ev("document.querySelector('.hot-swipe-viewport').scrollIntoView({block:'center'})");await wait(300);await swipe('.hot-swipe-viewport');await check("document.querySelector('.hot-post-controls>span').textContent.startsWith('2 /') && !document.querySelector('.ant-drawer-open')",'home touch swipe changes once without opening detail');
await ev("document.querySelector('.hot-post-controls button').click()");await wait(700);const banner=await ev("document.querySelector('.hot-post-controls>span').textContent");await wait(4300);await check(await ev("document.querySelector('.hot-post-controls>span').textContent")!==banner?'true':'false','home carousel advances automatically');
await ev("document.querySelector('.hot-post-controls button').click()");await wait(700);await ev("document.querySelector('.hot-post-card[aria-hidden=false]').click()");await wait(600);const paused=await ev("document.querySelector('.hot-post-controls>span').textContent");await wait(4300);await check(await ev("document.querySelector('.hot-post-controls>span').textContent")===paused?'true':'false','background carousel pauses during detail');
if(errors.length)throw Error(errors.join('\n'));console.log('Carousel stability checks passed');
} finally {ws.close()}
