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



await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1500);await consent();await click('以学生身份体验 →');await click('首页');await click('校园指南');await wait(300);await fill('input[aria-label="搜索校园地点"]','李老师');await ev("document.querySelector('.room-results button').click()");await check("document.querySelector('.map-destination').innerText.includes('B402')",'destination linked to search');await shot('guide-v2');await close();
await click('校园闲置');await wait(400);await check("!!document.querySelector('.market-item .hub-avatar')",'seller identity');await ev("document.querySelector('.product-open').click()");await wait(1500);await check("document.querySelectorAll('.product-gallery img').length>0",'product gallery');await shot('market-v2');await click('联系卖家 · 议价');await fill('input[aria-label="服务聊天消息"]','20 元可以吗？在哪见面？');await click('发送');await check("document.querySelector('.hub-chat-log').innerText.includes('20 元可以吗')",'negotiation message recorded');await close();await close();
await click('活动搭子');await wait(300);await check("!!document.querySelector('.activity-members .hub-avatar')",'member avatars');await check("![...document.querySelectorAll('.activity-item')][0].innerText.includes('进入活动群聊')",'nonmembers cannot chat');await click('加入活动');await click('进入活动群聊');await fill('input[aria-label="服务聊天消息"]','大家在体育馆哪个门集合？');await click('发送');await check("document.querySelector('.hub-chat-log').innerText.includes('哪个门')",'group message recorded');await shot('group-v2');await close();await click('退出活动');await check("![...document.querySelectorAll('.activity-item')].find(e=>e.innerText.includes('周末羽毛球'))",'left activity removed from mine');await close();
await click('倾诉空间');await wait(300);await check("!document.querySelector('.listening-space').innerText.includes('希望心理老师联系我')",'no prominent teacher prompt');await fill('textarea[aria-label="倾诉内容"]','今天想找人聊聊');await click('发送');await check("document.querySelector('.listen-ai').textContent.includes('慢慢说')",'listening works');await ev("document.querySelector('.listen-privacy summary').click()");await check("document.querySelector('.listen-privacy').innerText.includes('明确说明')",'truthful data explanation retained');await close();
for(const w of [320,430]){await resize(w);await click('校园指南');await wait(300);await check("document.querySelector('.campus-hub .ant-drawer-body').scrollWidth<=innerWidth",w+' fits');await close()}
await resize(390);if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Social hub checks passed')
