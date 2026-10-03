import { writeFile } from 'node:fs/promises'
const target=await (await fetch('http://127.0.0.1:9334/json/new?about:blank',{method:'PUT'})).json()
const ws=new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map();const browserErrors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')browserErrors.push(m.params.exceptionDetails.text);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=(ms=600)=>new Promise(r=>setTimeout(r,ms))
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





await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5175'});await wait(3000);await consent();await click('以学生身份体验 →');await click('消息');await wait(800);
const bounds=()=>ev("JSON.stringify({body:document.documentElement.scrollHeight,width:document.documentElement.clientWidth,scroll:scrollY,rects:['.mobile-header','.messenger-tools','.inbox-invitation','.inbox-filters','.inbox-scroll-area','.bottom-nav',...Array.from({length:5},(_,i)=>'.inbox-filters button:nth-child('+(i+1)+')')].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]})})");
for(const [width,height,mobile] of [[320,568,true],[390,844,true],[430,700,true],[1100,600,false]]){
await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await wait();await click('全部');const initial=await bounds();
await ev("document.querySelector('.inbox-scroll-area').scrollTop=1000");
for(const category of ['未读','群聊','交易','好友','全部','未读','全部']){await click(category);if(await bounds()!==initial)throw Error('Layout moved at '+width+' '+category);await check("document.querySelector('.inbox-scroll-area').scrollTop===0",width+' '+category+' resets list only')}
await check('document.documentElement.scrollHeight===innerHeight && document.documentElement.scrollWidth<=innerWidth',width+' viewport stable');await shot('messenger-stable-'+width);
}
await resize(390);await click('全部已读');const initial=await bounds();await click('未读');if(await bounds()!==initial)throw Error('Layout moved after read badge removed');await click('全部');
await click('通讯录');await check("document.querySelectorAll('.contact-item').length===2",'toolbar contacts');await close();await click('新的朋友');await click('接受');await click('忽略');await close();await check("document.querySelector('.inbox-invitation').textContent.includes('认识新的校园伙伴')",'request reminder updates');await click('新的朋友');await check("document.querySelectorAll('.friend-request-card').length===2",'request history accessible');await close();
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Stable inbox checks passed');
