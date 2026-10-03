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







await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1800);await consent();await click('以学生身份体验 →');await click('消息');await wait(800);await ev("[...document.querySelectorAll('.conversation-row')].find(b=>b.textContent.includes('小林')).click()");await wait(400);await click('聊天更多功能');await wait(400);await ev("[...document.querySelectorAll('.chat-option-list button')].find(b=>b.textContent.includes('好友备注')).click()");await fill('#friend-remark','摄影搭子小林');await click('保存备注');await check("document.querySelector('.chat-settings-profile b').textContent==='摄影搭子小林'",'remark saved');await shot('chat-settings-compact');await ev("document.querySelector('.chat-options-root .ant-drawer-close').click()");await wait(400);await check("document.querySelector('.conversation-root .ant-drawer-title').textContent==='摄影搭子小林'",'chat title updated');await ev("document.querySelector('.conversation-root .ant-drawer-close').click()");await wait(400);await check("document.querySelector('.conversation-list').textContent.includes('摄影搭子小林')",'list remark updated');await ev("[...document.querySelectorAll('.conversation-row')].find(b=>b.textContent.includes('摄影搭子小林')).click()");await wait(400);await click('聊天更多功能');await wait(400);await ev("[...document.querySelectorAll('.chat-option-list button')].find(b=>b.textContent.includes('删除好友')).click()");await click('保留好友');await check("!!document.querySelector('.peer-messages .message-row')",'cancel preserves messages');await ev("[...document.querySelectorAll('.chat-option-list button')].find(b=>b.textContent.includes('删除好友')).click()");await click('确认删除好友');await wait(500);await check("!document.querySelector('.conversation-list').textContent.includes('摄影搭子小林')",'deleted friend removed from conversations');await click('通讯录');await fill('[aria-label=搜索联系人]','小林');await check("document.body.textContent.includes('未找到好友')",'deleted friend removed from contacts');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Friend management passed');
