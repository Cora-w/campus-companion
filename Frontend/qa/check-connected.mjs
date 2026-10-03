import { writeFile } from 'node:fs/promises'
const targets=await (await fetch('http://127.0.0.1:9333/json')).json()
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map();const browserErrors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')browserErrors.push(m.params.exceptionDetails.text);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=(ms=250)=>new Promise(r=>setTimeout(r,ms))
const click=async text=>{
 if(['学生','心理教师','管理员'].includes(text) && await ev("!!document.querySelector('[name=login-role]')")){const value={'学生':'student','心理教师':'teacher','管理员':'admin'}[text];await ev(`document.querySelector('input[name="login-role"][value="${value}"]').click()`);await wait();return}

 if(/^以.+身份体验/.test(text)){await click(text.includes('心理教师')?'心理教师':text.includes('管理员')?'管理员':'学生');await click('演示账号 查看');await click('填入演示账号');text='登录'}

 const find=`(()=>{const bs=[...([...document.querySelectorAll('.ant-drawer-open')].at(-1) || document).querySelectorAll('button')].filter(b=>b.getClientRects().length);return bs.find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)})||bs.find(x=>x.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g,''))})})()`
 let ready=false
 for(let i=0;i<50;i++){if(await ev(`!!${find}`)){ready=true;break}await wait(100)}
 if(!ready)throw Error('Missing after waiting: '+text)
 await ev(`(()=>{const el=${find};if(el.disabled)throw Error('Disabled button');el.click()})()`);await wait()
}
const fill=async(selector,value)=>{await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait()}
const check=async(expression,label)=>{if(!await ev(expression))throw Error('Failed: '+label);console.log('PASS '+label)}
const consent=async()=>{await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}




await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1500);await ev("window.geoCalls=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail)=>{window.geoCalls++;fail({code:1})}}})");await consent();await click('以学生身份体验 →');await click('首页');await click('校园指南');await wait(350);await check('window.geoCalls===0','no automatic location request');await click('定位');await check("document.querySelector('.location-control').innerText.includes('未获得定位许可')",'permission denial');await ev("navigator.geolocation.getCurrentPosition=(ok)=>{window.geoCalls++;ok({coords:{latitude:30.1,longitude:120.2,accuracy:12}})}");await click('定位');await check("document.querySelector('.location-control').innerText.includes('30.10000') && document.querySelector('.location-control').innerText.includes('不能将此位置映射')",'location result with honest map boundary');await click('清除本次位置');await close();
await click('校园闲置');await wait(300);await ev("document.querySelector('.market-item p').click()");await wait(400);await check("!!document.querySelector('.product-detail-root.ant-drawer-open') && !!document.querySelector('.product-detail-root .product-gallery')",'card opens complete detail');await click('联系卖家 · 议价');await wait(600);await check("document.querySelector('[aria-label=消息]').getAttribute('aria-current')==='page'",'private message navigates to Messages');await fill('input[aria-label="服务聊天消息"]','可以便宜五元吗？');await click('发送');await check("document.querySelector('.hub-chat-log').innerText.includes('便宜五元')",'send private message');await shot('connected-chat');await close();await check("document.querySelectorAll('.service-thread').length===1 && document.querySelector('.conversation-row').classList.contains('pinned')",'service thread listed and AI pinned');await ev("document.querySelector('.service-thread').click()");await wait(350);await check("document.querySelector('.hub-chat-log').innerText.includes('便宜五元')",'reopen keeps message');await close();
await click('首页');await click('校园闲置');await wait(300);await ev("document.querySelector('.product-open').click()");await wait(300);await click('联系卖家 · 议价');await wait(400);await close();await check("document.querySelectorAll('.service-thread').length===1",'deduplicated service thread');
await click('首页');await click('倾诉空间');await wait(350);await check("document.querySelector('textarea[aria-label=倾诉内容]').getBoundingClientRect().height<70",'compact initial composer');for(const w of [320,390,430]){await resize(w);await check("document.querySelector('.listen-composer .ant-btn').getBoundingClientRect().width>=60 && document.querySelector('.campus-hub .ant-drawer-body').scrollWidth<=innerWidth",w+' composer fits')};await resize(390);await shot('compact-listen');await close();if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Connected flows passed')

