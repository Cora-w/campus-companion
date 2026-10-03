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
await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1500)
await consent();await click('以学生身份体验 →');await click('消息')
await check("document.querySelector('.conversation-row').classList.contains('pinned')",'AI pinned first');await shot('messages-list')
await ev("document.querySelector('.pinned').click()");await wait(500)
await fill('input[aria-label="向小心发送消息"]','有什么好玩的');await click('发送');await wait(900)
await check("document.querySelectorAll('.recommendation-card').length===2 && document.querySelector('.recommendation-card').textContent.includes('河畔')",'ranked recommendations');await check("document.querySelector('.chat-input').getBoundingClientRect().bottom<=innerHeight+1",'composer visible after reply');await shot('messages-ai');await close()
await click('通讯录');await check("document.querySelectorAll('.contact-item').length===2",'confirmed friends only');await close()
await ev("document.querySelector('.request-entry').click()");await wait(500);await click('接受');await click('忽略');await close()
await click('通讯录');await fill('input[aria-label="搜索联系人"]','学姐的备忘录');await click('聊天');await fill('input[aria-label="给好友发消息"]','摄影展几点见？');await click('发送');await check("document.querySelector('.peer-messages').textContent.includes('摄影展几点见？')",'accepted friend messaging');await close()
await check("document.querySelector('.conversation-row').classList.contains('pinned')",'pin survives new messages')
await click('首页');await click('评论刚来学校？先收藏这份食堂路线');await wait(500);await click('联系同学');await wait(500);await click('申请加为好友');await check("document.querySelector('.ant-drawer-open').innerText.includes('等待对方确认')",'pending outgoing request');await close()
await click('消息');await click('通讯录');await fill('input[aria-label="搜索联系人"]','南门观察员');await check("document.querySelector('.ant-drawer-open').innerText.includes('未找到好友')",'pending is not friendship');await close()
for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' list fits');await ev("document.querySelector('.pinned').click()");await wait(500);await check("[...document.querySelectorAll('.recommendation-card')].every(e=>e.getBoundingClientRect().right<=innerWidth)",width+' cards fit');await close()}
await resize(390);if(browserErrors.length)throw Error(browserErrors.join(';'));console.log('Messaging checks passed');ws.close()
