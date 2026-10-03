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




await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5175'});await wait(4000);await consent();await click('以学生身份体验 →');await click('消息');await wait(1000);
await check("document.querySelectorAll('.inbox-peer').length===2",'friend conversations loaded');
await click('未读');await check("document.querySelectorAll('.inbox-peer').length===2 && !document.querySelector('.inbox-ai')",'unread filter');
await ev("document.querySelector('.inbox-peer .conversation-row').click()");await wait();await fill('[aria-label=给好友发消息]','草稿内容测试');await close();
await check("document.querySelectorAll('.inbox-peer').length===1",'opening marks read');await click('全部');
await check("document.querySelector('.inbox-draft')?.textContent.includes('草稿')",'draft preview');
await ev("document.querySelector('.inbox-peer .conversation-row').click()");await wait();await check("document.querySelector('[aria-label=给好友发消息]').value==='草稿内容测试'",'draft restored');await click('发送');
await check("document.querySelector('.peer-messages').textContent.includes('草稿内容测试')",'message sent');await shot('messenger-chat-new');await close();
await check("!document.querySelector('.inbox-draft')",'sent draft cleared');
await ev("document.querySelectorAll('.inbox-more')[1].click()");await wait();await ev("[...document.querySelectorAll('[role=menuitem]')].find(e=>e.textContent.includes('置顶会话')).click()");await wait();
await check("document.querySelector('.inbox-peer').classList.contains('is-pinned')",'friend pinned above others');
await click('全部已读');await click('未读');await check("!!document.querySelector('.inbox-empty')",'all read empty state');await click('全部');
await ev("document.querySelector('.inbox-more').click()");await wait();await ev("[...document.querySelectorAll('[role=menuitem]')].find(e=>e.textContent.includes('标记未读')).click()");await wait();await click('未读');await check("document.querySelectorAll('.inbox-peer').length===1",'manual unread');await click('全部');
await fill('[aria-label=搜索会话]','完全不存在的关键词');await check("!document.querySelector('.conversation-row') && !!document.querySelector('.inbox-empty')",'search excludes AI and unmatched peers');
await fill('[aria-label=搜索会话]','草稿内容测试');await check("document.querySelectorAll('.inbox-peer').length===1",'search message content');await fill('[aria-label=搜索会话]','');
await click('群聊');await check("!!document.querySelector('.inbox-empty')",'group empty state');await click('交易');await check("!!document.querySelector('.inbox-empty')",'trade empty state');await click('全部');
await ev("document.querySelector('.request-entry').click()");await wait();await click('接受');await click('忽略');await close();await click('通讯录');await check("document.querySelectorAll('.contact-item').length===3",'friend request acceptance');await close();
await ev("document.querySelector('.inbox-ai').click()");await wait();await fill('[aria-label=向小心发送消息]','有什么好玩的');await click('发送');await wait(1000);await check("document.querySelectorAll('.recommendation-card').length>0",'AI recommendations retained');await close();
for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' inbox fits');await shot('messenger-new-'+width);await ev("document.querySelector('.inbox-peer .conversation-row').click()");await wait();await check("document.querySelector('.chat-input').getBoundingClientRect().bottom<=innerHeight+1",width+' composer visible');await close()}
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Messenger redesign checks passed');
