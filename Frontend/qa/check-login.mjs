import { writeFile } from 'node:fs/promises'
const targets=await (await fetch('http://127.0.0.1:9334/json')).json()
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
await call('Page.navigate',{url:'http://127.0.0.1:5176'});await wait(1700)
await check("document.querySelector('.account-brand h1').textContent.includes('心伙伴') && !!document.querySelector('.companion-logo')",'product title and logo')
await check("!document.querySelector('[name=login-role]')",'no identity choices')
await click('演示账号 查看');await check("document.querySelector('.account-sample').innerText.includes('S-DEMO-01') && !document.querySelector('.account-sample').innerText.includes('T-DEMO')",'student demo only')
await click('填入演示账号');await consent()
for(const id of ['T-DEMO-01','A-DEMO-01','M-DEMO-01']){await fill('#login-account',id);await click('登录');await check("!!document.querySelector('.account-login') && document.body.innerText.includes('不匹配')",id+' unavailable')}
await fill('#login-account','S-DEMO-01');await fill('#login-password','wrong');await click('登录');await check("document.body.innerText.includes('不匹配')",'wrong password rejected')
await fill('#login-password','Demo@2026');await click('登录');await wait(700);await check("!!document.querySelector('.wall-feed')",'student login')
for(const tab of ['发现','消息','我的','首页']){
 await ev(`document.querySelector('.bottom-nav button[aria-label="${tab}"]').click()`);await wait(650)
 await check("!!document.querySelector('.main-shell') && !document.querySelector('.loading-page')",tab+' loads after reorganization')
}
await call('Page.reload');await wait(1200)
for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' fits');await shot('login-'+width)}
await resize(390);if(browserErrors.length)throw Error(browserErrors.join(';'));console.log('Login checks passed');ws.close()

