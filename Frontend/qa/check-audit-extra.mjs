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







await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(2000);await consent();await click('以学生身份体验 →');await click('首页');await click('零食铺子');await click('进入下课零食社');await click('添加海盐脆薯片');await click('去结算');await click('到店自提');await ev("[...document.querySelectorAll('.snack-overlay button')].find(b=>b.textContent.includes('提交演示订单')).click()");await wait(400);
for(let i=0;i<2;i++){await ev("document.querySelector('.snack-root .ant-drawer-close').click()");await wait(400)}await click('我的');await ev("document.querySelector('.profile-order-entry').click()");await wait(400);await check("document.querySelector('.profile-order-card').textContent.includes('合计 ¥6.50')&&!document.querySelector('.profile-order-card').textContent.includes('650.00')",'profile uses yuan, consistent with checkout');await click('取消订单');await click('确认取消');await check("document.querySelector('.profile-order-card').textContent.includes('已取消')",'profile cancellation works');for(const w of [320,430]){await resize(w);await check("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollWidth<=document.querySelector('.ant-drawer-open .ant-drawer-body').clientWidth",w+' order fits')}await shot('audit-profile-orders');await close();
await click('首页');await ev("document.querySelector('[aria-label=搜索校园内容]').click()");await wait(400);await fill('[aria-label=校园搜索关键词]','零食');await ev("[...document.querySelectorAll('.search-result-row')].find(x=>x.textContent.includes('下课零食社')).click()");await wait(500);await check("!!document.elementFromPoint(190,220).closest('.snack-root')",'search opens shop above search sheet');await ev("document.querySelector('.snack-root .ant-drawer-close').click()");await wait(500);await check("document.querySelector('[aria-label=校园搜索关键词]').value==='零食'",'shop returns to original search');await fill('[aria-label=校园搜索关键词]','教室');await ev("[...document.querySelectorAll('.search-result-row')].find(x=>x.textContent.includes('校园指南')).click()");await wait(500);await check("!!document.elementFromPoint(190,220).closest('.campus-hub-root')",'search opens guide above search sheet');await ev("document.querySelector('.campus-hub .ant-drawer-close').click()");await wait(400);await check("document.querySelector('[aria-label=校园搜索关键词]').value==='教室'",'guide returns to original search');await close();
await click('发现');await click('好玩');await click('查看校园摄影展');await ev("document.querySelector('.place-story-content').click()");await wait(400);const title=await ev("document.querySelector('.post-detail h2').textContent");await fill('[aria-label=评论内容]','未发送的评论草稿');await ev("document.querySelector('.post-detail .post-location').click()");await wait(400);await close();await check("document.querySelector('.post-detail h2').textContent==="+JSON.stringify(title)+"&&document.querySelector('[aria-label=评论内容]').value==='未发送的评论草稿'",'post identity and draft restore across nested place');await close();await check("!!document.querySelector('.place-community')",'deeper navigation still returns to initial place');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Additional audit checks passed');
