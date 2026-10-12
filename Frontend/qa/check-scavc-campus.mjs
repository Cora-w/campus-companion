import { writeFile } from 'node:fs/promises'
const browserPort=process.env.CDP_PORT || '9346'
const baseUrl=process.env.APP_URL || 'http://127.0.0.1:5186'
const targets=await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json()
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map();const browserErrors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')browserErrors.push(m.params.exceptionDetails.text);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=(ms=250)=>new Promise(r=>setTimeout(r,ms))
const click=async text=>{
 const find=`(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length);return bs.find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)})||bs.find(x=>x.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g,''))})})()`
 let ready=false
 for(let i=0;i<50;i++){if(await ev(`!!${find}`)){ready=true;break}await wait(100)}
 if(!ready)throw Error('Missing after waiting: '+text)
 await ev(`(()=>{const el=${find};if(el.disabled)throw Error('Disabled button');el.click()})()`);await wait()
}
const fill=async(selector,value)=>{await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait()}
const check=async(expression,label)=>{if(!await ev(expression))throw Error('Failed: '+label);console.log('PASS '+label)}
const consent=async()=>{await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/scavc-${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}




await call('Runtime.enable');await call('Page.enable');await resize(390)
await call('Page.navigate',{url:baseUrl});await wait(1800)
await fill('#login-account','S-DEMO-01');await fill('#login-password','Demo@2026');await consent();await click('登录');await wait(800)
if(await ev("!!document.querySelector('[name=school]')")){
 await ev("document.querySelector('[name=school]').click()");await wait();await click('确认学校，进入校园');await wait(800)
}
await click('发现')
await check("document.querySelectorAll('.discover-shop-card').length===20",'16 campus entries plus 4 labeled samples')
await check("document.querySelector('.discover-shop-card h3').innerText==='蜜雪冰城（航院校内店）'",'campus entries first')
for(const width of [320,390,430,1280]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' no page overflow')}
await resize(390);await shot('shops')
await fill('[aria-label="搜索发现"]','115');await check("document.querySelectorAll('.discover-shop-card').length===1",'room search')
await click('查看熊麻婆现炒浇头面・饭');await check("document.querySelector('.discover-detail').innerText.includes('115号') && document.querySelector('.discover-detail').innerText.includes('人均待补充')",'real address and unknown price')
if(await ev("[...document.querySelectorAll('.discover-detail button')].some(b=>b.innerText==='收藏店铺')"))await click('收藏店铺');await check("document.querySelector('.discover-detail').innerText.includes('已收藏')",'shop favorite')
await shot('shop-detail');await close();await fill('[aria-label="搜索发现"]','');await click('首页');await click('校园指南')
await check("document.querySelector('.scavc-map img').complete && document.querySelector('.scavc-map img').naturalWidth>=3000",'bundled high resolution official map loaded')
await check("!document.querySelector('.campus-hub').innerText.includes('陈老师')",'sample offices removed')
await shot('map');await ev("document.querySelector('.scavc-map .ant-image').click()");await wait(400)
await check("!!document.querySelector('.ant-image-preview')",'map zoom preview opens')
await ev('window.campusBack()');await wait(400)
await click('图书馆');await check("document.querySelector('.campus-hub').innerText.includes('已选目的地')",'official building selection')
await fill('[aria-label="搜索校园地点"]','天舟');await check("document.querySelectorAll('.room-results button').length===1",'official place search')
for(const width of [320,390,1280]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' map page fits')}
if(browserErrors.length)throw Error(JSON.stringify(browserErrors))
console.log('PASS no browser runtime exceptions');ws.close()
