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




await call('Runtime.enable');await call('Page.enable');await resize(390);
await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1500);await consent();await click('以学生身份体验 →');await click('首页');
const closeProfile=async()=>{await ev("document.querySelector('.contact-profile').closest('.ant-drawer-section').querySelector('.ant-drawer-close').click()");await wait(400)};
await ev("document.querySelector('.wall-author .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('#friend-request-message')",'feed avatar opens application');await closeProfile();
await click('评论刚来学校？先收藏这份食堂路线');await wait(400);
await ev("document.querySelector('.post-detail .wall-author .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('#friend-request-message')",'detail avatar opens application above post');await closeProfile();
await ev("document.querySelector('.post-detail .comment-author .user-avatar-button').click()");await wait(400);
await check("document.querySelector('.contact-profile').textContent.includes('发消息')",'comment avatar shares existing friendship');await closeProfile();await close();
await click('校园指南');await wait(400);await click('校园通知');
await ev("document.querySelector('.campus-hub .ant-drawer-body').scrollTop=150");
const before=await ev("document.querySelector('.campus-hub .ant-drawer-body').scrollTop");
await ev("[...document.querySelectorAll('.campus-hub .hub-card button')][2].click()");await wait(400);
await check("document.querySelector('.notice-detail-root .ant-drawer-body').scrollTop===0",'notice opens at top');
await check("document.querySelector('.notice-detail h2').textContent.includes('创新设计赛')",'correct notice');
await check("!document.querySelector('.notice-detail').textContent.includes('登记参赛意向')",'registration removed');
await fill('[aria-label="通知评论内容"]','请问在哪里查看具体安排？');await ev("document.querySelector('.notice-detail button[type=submit]').click()");await wait();
await check("document.querySelector('.notice-detail .campus-comment').textContent.includes('具体安排')",'notice comment works');await shot('notice-detail-new');
await ev("document.querySelector('.notice-detail-root .ant-drawer-close').click()");await wait(400);
await check("document.querySelector('.campus-hub .ant-drawer-body').scrollTop==="+before,'list position preserved');
await ev("document.querySelector('.campus-hub .hub-card button').click()");await wait(400);
await check("!document.querySelector('.notice-detail .campus-comment')",'comments isolated per notice');
await ev("document.querySelector('.notice-detail-root .ant-drawer-close').click()");await wait(400);await ev("document.querySelector('.campus-hub .ant-drawer-close').click()");await wait(400);
await click('校园闲置');await wait(400);await ev("document.querySelector('.market-item .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('.contact-profile')",'market avatar profile');await closeProfile();
await ev("document.querySelector('.product-open').click()");await wait(400);await ev("document.querySelector('.product-detail-root .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('.contact-profile')",'product detail avatar profile');await closeProfile();
await ev("document.querySelector('.product-detail-root .ant-drawer-close').click()");await wait(400);await ev("document.querySelector('.campus-hub .ant-drawer-close').click()");await wait(400);
await click('活动搭子');await wait(400);await ev("document.querySelector('.activity-item .hub-person .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('#friend-request-message')",'activity host application');
await fill('#friend-request-message','想约你一起打球');await click('发送好友申请');await closeProfile();
await ev("document.querySelector('.activity-members .user-avatar-button').click()");await wait(400);
await check("document.querySelector('.friend-request-result').textContent.includes('想约你一起打球')",'member avatar shares host request state');
for(const width of [320,430]){await resize(width);await check("document.querySelector('.contact-profile').scrollWidth<=document.querySelector('.contact-profile').clientWidth",width+' profile fits')}

await closeProfile();await ev("document.querySelector('.campus-hub .ant-drawer-close').click()");await wait(400);
await click('校园闲置');await wait(400);await ev("document.querySelector('.product-open').click()");await wait(400);await click('联系卖家 · 议价');await wait(400);
await ev("document.querySelector('.hub-chat-context .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('.contact-profile')",'service chat avatar opens profile');await closeProfile();
await ev("document.querySelector('.hub-chat-root .ant-drawer-close').click()");await wait(400);await click('消息');
await ev("document.querySelector('.service-thread .user-avatar-button').click()");await wait(400);
await check("!!document.querySelector('.contact-profile')",'service conversation list avatar opens profile');await closeProfile();
await ev("[...document.querySelectorAll('.conversation-row:not(.pinned):not(.service-thread)')][0].querySelector('.user-avatar-button').click()");await wait(400);
await check("document.querySelector('.contact-profile').textContent.includes('发消息')",'friend conversation avatar opens profile');await click('发消息');await wait(400);
await ev("document.querySelector('.peer-messages .user-avatar-button').click()");await wait(400);
await check("document.querySelector('.contact-profile').textContent.includes('发消息')",'chat message avatar opens profile');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Notices and avatars passed');
