import { writeFile } from 'node:fs/promises'
const targets=await (await fetch('http://127.0.0.1:9333/json')).json()
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map();const browserErrors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')browserErrors.push(JSON.stringify(m.params.exceptionDetails));if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=(ms=250)=>new Promise(r=>setTimeout(r,ms))
const click=async text=>{
 if(['学生','心理教师','管理员'].includes(text) && await ev("!!document.querySelector('[name=login-role]')")){const value={'学生':'student','心理教师':'teacher','管理员':'admin'}[text];await ev(`document.querySelector('input[name="login-role"][value="${value}"]').click()`);await wait();return}

 if(/^以.+身份体验/.test(text)){await click(text.includes('心理教师')?'心理教师':text.includes('管理员')?'管理员':'学生');await click('演示账号 查看');await click('填入演示账号');text='登录'}

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











await call('Runtime.enable');await call('Page.enable');await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(2000);await resize(390);await ev("Object.keys(localStorage).filter(k=>k.startsWith('campus-login-v1:')).forEach(k=>localStorage.removeItem(k))");await call('Page.reload');await wait(1800);await consent();await fill('#login-account','S-DEMO-01');await fill('#login-password','Demo@2026');await click('登录');await wait(500);await click('消息');await check("document.querySelectorAll('.inbox-avatar-wrap .inbox-unread').length===2&&!document.querySelector('.conversation-meta .inbox-unread')",'unread badges on avatars only');await check("document.querySelector('.inbox-more svg').getBoundingClientRect().width===20",'compact more icon');await shot('inbox-avatar-unread');await ev("document.querySelector('[aria-label=打开与小林的聊天]').click()");await wait(300);await ev("document.querySelector('.conversation-root .ant-drawer-close').click()");await wait(400);await check("document.querySelectorAll('.inbox-avatar-wrap .inbox-unread').length===1",'opening chat clears avatar unread');await click('小林的会话操作');await ev("[...document.querySelectorAll('.ant-dropdown-menu-item')].find(x=>x.textContent.includes('标记未读')).click()");await wait(300);await check("document.querySelectorAll('.inbox-avatar-wrap .inbox-unread').length===2",'mark unread restores avatar badge');await call('Page.reload');await wait(2000);await check("!!document.querySelector('.bottom-nav')&&!document.querySelector('#login-password')",'reload restores login');await call('Page.navigate',{url:'about:blank'});await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(2200);await check("!!document.querySelector('.bottom-nav')",'reopening app restores login');await check("Object.keys(localStorage).filter(k=>k.startsWith('campus-login-v1:')).every(k=>!localStorage[k].includes('Demo@2026'))",'password not stored');await click('我的');await click('打开设置');await click('退出当前身份');await click('确认退出');await wait(500);await call('Page.reload');await wait(1800);await check("!!document.querySelector('#login-password')&&!document.querySelector('.bottom-nav')",'explicit logout persists');ws.close();console.log('Login and unread checks passed');
