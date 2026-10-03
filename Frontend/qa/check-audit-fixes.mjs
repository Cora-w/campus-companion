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

 if(/^以.+身份体验/.test(text)){await click('切换身份');await click(text.includes('心理教师')?'心理教师':text.includes('管理员')?'管理员':'学生');await click('演示账号 查看');await click('填入演示账号');text='登录'}

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







await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(2200);
const loginRole=async(role,id)=>{await click('切换身份');await click({student:'学生',merchant:'商家',teacher:'心理教师',admin:'管理员'}[role]);await fill('#login-account',id);await fill('#login-password','Demo@2026');await consent();await click('登录');await wait(600)};
const closeSnack=async(cls)=>{await ev(`document.querySelector('${cls} .ant-drawer-close').click()`);await wait(400)}
await loginRole('student','S-DEMO-01');await click('首页');await click('零食铺子');await click('进入下课零食社');
const buy=async()=>{await click('添加海盐脆薯片');await click('去结算');await click('到店自提');await ev("(()=>{const b=[...document.querySelectorAll('.snack-overlay button')].find(b=>b.textContent.includes('提交演示订单'));b.click();b.click()})()");await wait(400)}
await buy();await check("document.querySelector('.snack-products').textContent.includes('库存 11')",'order deducts stock once on double click');await click('查看订单');await check("document.querySelectorAll('.snack-order').length===1",'double click creates one order');await click('取消订单');await click('再想想');await check("document.querySelector('.snack-order').textContent.includes('待接单')",'cancel confirmation can be dismissed');await click('取消订单');await click('确认取消');await wait(400);await check("document.querySelector('.snack-order').textContent.includes('已取消')",'student cancellation recorded');await closeSnack('.snack-overlay.ant-drawer-open');await check("document.querySelector('.snack-products').textContent.includes('库存 12')",'cancel restores inventory');
await buy();await closeSnack('.snack-root');await closeSnack('.snack-root');await click('我的');await click('打开设置');await click('退出当前身份');await click('确认退出');await loginRole('merchant','M-DEMO-01');await click('订单');await click('拒绝订单');await check("[...document.querySelectorAll('.merchant-card')].every(x=>x.textContent.includes('已取消'))",'merchant rejection visible');await click('商品');await check("document.querySelector('.merchant-card').textContent.includes('库存 12')",'merchant rejection restores stock');await click('我的');await click('退出当前身份');
await loginRole('student','S-DEMO-01');await click('消息');await ev("document.querySelector('.request-entry').click()");await wait(400);await click('接受');await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(400);await check("document.querySelectorAll('.conversation-row').length>=4 && document.querySelector('.conversation-list').textContent.includes('打个招呼，开始聊天')",'accepted friend immediately has empty conversation');
await click('发现');await click('好玩');await click('查看校园摄影展');await click('收藏地点');await close();await click('我的');await ev("document.querySelector('.personal-stats button:nth-child(2)').click()");await wait(400);await ev("[...document.querySelectorAll('.compact-post-list button')].find(b=>b.textContent.includes('校园摄影展')).click()");await wait(400);await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop=400");await ev("document.querySelector('.place-story-content').click()");await wait(400);await check("!!document.querySelector('.post-detail')",'collection to place to post');await close();await check("!!document.querySelector('.place-community')",'first back returns to place');await check("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop>0",'place scroll restored');await close();await check("document.querySelector('.ant-drawer-open .ant-drawer-title').textContent==='我的收藏'",'second back returns to collection');await close();await check("!document.querySelector('.ant-drawer-open')",'third back closes collection');
await shot('audit-fixes-profile');if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Audit fixes integration passed');
