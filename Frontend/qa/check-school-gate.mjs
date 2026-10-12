import { writeFile } from 'node:fs/promises'
const targets=await (await fetch('http://127.0.0.1:9335/json')).json()
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
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}


await call('Runtime.enable');await call('Page.enable');await resize(390)
await call('Page.navigate',{url:'http://127.0.0.1:5176'});await wait(1200)
await ev("Object.keys(localStorage).filter(k=>k.startsWith('campus-login-v1:')||k==='campus-school-v1:S-DEMO-01').forEach(k=>localStorage.removeItem(k))")
await call('Page.reload');await wait(1000)
const login=async()=>{await fill('#login-account','S-DEMO-01');await fill('#login-password','Demo@2026');await consent();await click('登录');await wait(800)}
await login()
await check("!!document.querySelector('.school-picker') && !document.querySelector('.bottom-nav') && !document.querySelector('.wall-feed')",'unbound student cannot access campus')
await check("[...document.querySelectorAll('.school-picker button')].find(b=>b.innerText.includes('确认学校')).disabled",'no default school and confirmation disabled')
await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait()
await check("!!document.querySelector('.school-picker')",'escape cannot dismiss')
await ev("document.querySelector('.ant-modal-mask').click()");await wait()
await check("!document.querySelector('.wall-feed')",'mask cannot bypass gate')
await click('暂不选择，退出登录');await wait(500)
await check("!!document.querySelector('#login-account')",'declining logs out')
await login();await ev('history.back()');await wait(650)
await check("!!document.querySelector('#login-account')",'system back logs out')
await login();await fill('[aria-label="搜索学校"]','不存在的学校')
await check("document.body.innerText.includes('未找到学校')",'search empty state')
await fill('[aria-label="搜索学校"]','航天')
await check("document.querySelectorAll('[name=school]').length===1",'school search')
await ev("document.querySelector('[name=school]').click()");await wait();await shot('school-required')
await ev("window.originalStorageSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('campus-school-v1:'))throw new Error('学校保存失败，请重试');return window.originalStorageSetItem.call(this,key,value)}")
await click('确认学校，进入校园');await wait(400)
await check("!!document.querySelector('.school-picker') && !document.querySelector('.wall-feed') && document.body.innerText.includes('学校保存失败')",'failed persistence cannot unlock campus')
await ev("Storage.prototype.setItem=window.originalStorageSetItem;delete window.originalStorageSetItem")
await click('确认学校，进入校园');await wait(800)
await check("!!document.querySelector('.wall-feed') && document.querySelector('.bound-school').innerText.includes('四川航天职业技术学院')",'school binding unlocks own campus')
await call('Page.reload');await wait(1600)
await check("!!document.querySelector('#login-account') && !document.querySelector('.wall-feed')",'refresh returns to login'); await login(); await check("!!document.querySelector('.wall-feed') && !document.querySelector('.school-picker')",'explicit login retains school')
await ev("Object.keys(localStorage).filter(k=>k.startsWith('campus-login-v1:')).forEach(k=>localStorage.removeItem(k))")
await call('Page.reload');await wait(800);await login()
await check("!!document.querySelector('.wall-feed') && !document.querySelector('.school-picker')",'school survives logout and fresh login')
for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' fits')}
if(browserErrors.length)throw Error(browserErrors.join(';'));console.log('School gate checks passed');ws.close()
