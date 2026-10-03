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

 const find=`(()=>{const bs=[...(document.querySelector('.ant-drawer-open') || document).querySelectorAll('button')].filter(b=>b.getClientRects().length);return bs.find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)})||bs.find(x=>x.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g,''))})})()`
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


await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1600);await consent();await click('以学生身份体验 →');await click('首页');
await check("document.querySelectorAll('.campus-hub-entries button').length===4",'four service entrances');await click('管理首页分类');await check("!document.querySelector('.category-choices').innerText.includes('新生指南') && !document.querySelector('.category-choices').innerText.includes('匿名树洞')",'services removed from category management');await close();
await click('校园指南');await wait(400);await fill('input[aria-label="搜索校园地点"]','李老师');await ev("document.querySelector('.room-results button').click()");await check("document.querySelector('.room-detail').innerText.includes('B402')",'office search and room route');await shot('hub-guide');await click('校园通知');await ev("document.querySelectorAll('.campus-hub .hub-card button')[1].click()");await click('关注报名通知');await check("document.querySelector('.notice-detail').innerText.includes('已登记')",'exam reminder intent');await close();
await click('校园闲置');await wait(400);await click('询问与预订');await click('模拟双方确认预订');await check("document.querySelector('.market-item').innerText.includes('已预订')",'reservation closes inquiries');await click('取消我的预订');await click('我的');await click('标记已售出');await check("document.querySelector('.market-item').innerText.includes('已售出')",'owner can mark sold');await click('全部');await check("[...document.querySelectorAll('.market-item button')].some(b=>b.disabled && b.textContent.includes('停止询问'))",'sold listings blocked');await shot('hub-market');await close();
await click('活动搭子');await wait(400);await click('加入活动');await check("document.querySelector('.activity-item').innerText.includes('已满员')",'last place fills activity');await click('退出活动');await click('可加入');await check("document.querySelector('.activity-item').innerText.includes('3 / 4')",'withdraw releases place');await click('我的');await click('结束招募');await check("document.querySelector('.activity-item').innerText.includes('已结束')",'organizer closes activity');await shot('hub-activities');await close();
await click('倾诉空间');await wait(400);await fill('textarea[aria-label="倾诉内容"]','PRIVATE-LISTEN-TEST 今天有点疲惫');await click('发送');await check("!!document.querySelector('.listen-ai')",'private listening response');await click('希望心理老师联系我');await check("[...document.querySelectorAll('.listening-space button')].find(b=>b.textContent.includes('发送联系请求')).disabled",'consent required');await ev("document.querySelector('.listening-space input[type=checkbox]').click()");await click('发送联系请求');await check("document.querySelector('.listening-space').innerText.includes('已进入演示教师待办')",'support request submitted');await shot('hub-listen');await close();
for(const width of [320,390,430]){await resize(width);for(const entry of ['校园指南','校园闲置','活动搭子','倾诉空间']){await click(entry);await wait(200);await check("document.querySelector('.campus-hub .ant-drawer-body').scrollWidth<=innerWidth",width+' '+entry+' fits');await close()}}
await resize(390);await click('我的');await click('退出当前身份');await click('心理教师');await consent();await click('以心理教师身份体验 →');await wait(500);await check("document.querySelector('.teacher-support-requests').innerText.includes('学习压力')",'teacher gets authorized request');await check("!document.body.innerText.includes('PRIVATE-LISTEN-TEST')",'teacher cannot read chat');await click('受理联系请求');await shot('hub-teacher');await click('我的');await click('退出当前身份');await click('学生');await consent();await click('以学生身份体验 →');await click('首页');await click('倾诉空间');await wait(400);await check("document.querySelector('.listening-space').innerText.includes('老师已受理')",'student receives acceptance state');await close();await shot('hub-home');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Hub checks passed')
