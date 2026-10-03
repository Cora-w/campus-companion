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
const close=async()=>{await ev("[...document.querySelectorAll('.ant-drawer-open')].sort((a,b)=>Number(getComputedStyle(b).zIndex)-Number(getComputedStyle(a).zIndex))[0].querySelector('.ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}









await call('Runtime.enable');await call('Page.enable');await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(2200);await resize(390);await consent();await ev("(()=>{const s=document.querySelector('[aria-label=登录身份]');s.value='student';s.dispatchEvent(new Event('change',{bubbles:true}))})()");await fill('#login-account','S-DEMO-01');await fill('#login-password','Demo@2026');await click('登录');await wait(500);await click('我的');await click('打开设置');await ev("[...document.querySelectorAll('.profile-settings button')].find(x=>x.textContent.includes('账号与校园身份')).click()");await wait(350);await close();await check("!!document.querySelector('.profile-settings') && document.querySelectorAll('.ant-drawer-open').length===1",'identity returns to settings');await close();
await click('发现');await click('好吃');await ev("document.querySelector('.discover-shop-main').click()");await wait(350);await ev("document.querySelector('.discover-review-author [role=button]').click()");await wait(350);await check("!!document.querySelector('.friend-request-form')",'review avatar opens friend application');await fill('#friend-request-message','你好，想了解你推荐的这家店');await click('发送好友申请');await check("document.querySelector('.friend-request-result').textContent.includes('想了解')",'review friend request saved');await close();await close();
await click('发布');await fill('#post-title','删除后的点赞计数测试');await fill('#post-text','用来验证删除后是否清理点赞记录。');await click('发布到校园墙');await wait(350);await click('点赞删除后的点赞计数测试');await click('评论删除后的点赞计数测试');await click('删除我的动态');await click('我的');await check("document.querySelector('.personal-stats button:nth-child(3) b').textContent==='0'",'deleted post removes like count');await ev("document.querySelector('.personal-stats button:nth-child(3)').click()");await wait(350);await check("document.querySelectorAll('.compact-post-list button').length===0 && document.querySelector('.ant-drawer-open .ant-drawer-body').innerText.includes('这里还没有内容')",'deleted post has correct empty state');await close();await click('消息');await ev("document.querySelector('.conversation-row [aria-label=查看小林的资料]').click()");await wait(350);await check("!!document.querySelector('.contact-profile')&&!document.querySelector('.conversation-root.ant-drawer-open')",'inbox avatar opens profile without opening chat');await close();await ev("document.querySelector('[aria-label=打开与小林的聊天]').click()");await wait(350);await check("!!document.querySelector('.conversation-root.ant-drawer-open')",'conversation row still opens chat');if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Regression passed');
