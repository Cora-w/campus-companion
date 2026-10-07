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





await call('Runtime.enable');await call('Page.enable');await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await resize(390);
await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.testViewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{value:window.testViewport,configurable:true});window.simulateKeyboard=(height,offset=0)=>{Object.assign(window.testViewport,{height,offsetTop:offset});window.testViewport.dispatchEvent(new Event('resize'));window.testViewport.dispatchEvent(new Event('scroll'))}"});
await call('Page.navigate',{url:'http://127.0.0.1:5175'});await wait(3500);if(await ev("!!document.querySelector('input[type=checkbox]')&&!document.querySelector('.bottom-nav')")){await consent();await click('演示账号 查看');await click('填入演示账号');await click('登录');}await click('消息');await wait(700);
const before=await ev("JSON.stringify(['.mobile-header','.messenger-tools','.inbox-filters'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON()))");
await ev("document.querySelector('[aria-label=搜索会话]').focus()");
for(const height of [700,550,480,550,700,844]){await ev('simulateKeyboard('+height+')');await wait(50);await check("JSON.stringify(['.mobile-header','.messenger-tools','.inbox-filters'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON()))==="+JSON.stringify(before),'inbox stable at '+height);await check("getComputedStyle(document.querySelector('.bottom-nav')).display==="+JSON.stringify(height<724?'none':'grid'),'navigation matches keyboard '+height)}
await ev("document.querySelector('[aria-label=搜索会话]').blur();document.querySelector('.inbox-peer .conversation-row').click()");await wait(700);await fill('[aria-label=给好友发消息]','键盘测试草稿');
for(const [height,offset] of [[650,0],[480,0],[480,35],[650,0],[844,0]]){await ev('simulateKeyboard('+height+','+offset+')');await wait(80);await check("Math.abs(document.querySelector('.chat-input').getBoundingClientRect().bottom-"+(height+offset)+")<2",'composer follows visible viewport '+height+'/'+offset);await check("document.documentElement.style.getPropertyValue('--viewport-height')==='844px'",'page retains layout height')}
await check("document.querySelector('[aria-label=给好友发消息]').value==='键盘测试草稿'",'draft survives keyboard changes');await close();await check("JSON.stringify(['.mobile-header','.messenger-tools','.inbox-filters'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON()))==="+JSON.stringify(before),'return to stable inbox');

await click('发布');await wait(800);
await ev("document.querySelector('#post-title').focus()");
await check("getComputedStyle(document.querySelector('#post-title')).outlineStyle==='none'&&getComputedStyle(document.querySelector('#post-title')).boxShadow==='none'",'title has no focus frame');
await fill('#post-title','输入样式验证');await ev("document.querySelector('#post-text').focus()");await fill('#post-text','输入时没有橙色边框，键盘收起后导航恢复。');
await check("getComputedStyle(document.querySelector('#post-text')).outlineStyle==='none'&&getComputedStyle(document.querySelector('#post-text')).boxShadow==='none'",'textarea has no focus frame');
await ev('simulateKeyboard(480)');await wait();
await check("getComputedStyle(document.querySelector('.bottom-nav')).display==='none'&&getComputedStyle(document.querySelector('.app-shell')).paddingBottom==='0px'",'publish keyboard hides nav and reserved space');
await check("document.querySelector('.compose-publish-bar').getBoundingClientRect().bottom<=481",'publish actions fit above keyboard');
await shot('publish-typing-no-frame');
await ev('simulateKeyboard(844)');await wait();await check("getComputedStyle(document.querySelector('.bottom-nav')).display==='grid'",'keyboard dismissed while input focused restores nav');
await check("document.querySelector('#post-text').value.includes('导航恢复')",'text preserved');
await click('所在位置');await ev("document.querySelector('[aria-label=搜索地点]').focus()");
await check("(()=>{const e=document.querySelector('[aria-label=搜索地点]'),w=e.closest('.ant-input-affix-wrapper');return getComputedStyle(e).outlineStyle==='none'&&getComputedStyle(w).boxShadow==='none'&&getComputedStyle(w).borderTopColor==='rgb(229, 225, 218)'})()",'search wrapper remains neutral on focus');
await ev('simulateKeyboard(480)');await wait();await check("getComputedStyle(document.querySelector('.bottom-nav')).display==='none'",'overlay input also hides navigation');await ev("document.activeElement.blur();simulateKeyboard(844)");await close();
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Keyboard viewport and input styles browser checks passed');
