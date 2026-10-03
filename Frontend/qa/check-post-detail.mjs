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



await call('Runtime.enable'); await call('Page.enable'); await resize(390);
await call('Page.navigate',{url:'http://127.0.0.1:5173'}); await wait(1500);
await consent(); await click('以学生身份体验 →'); await click('首页');
await ev("document.querySelector('.wall-post .post-body-button').click()"); await wait(400);
await check("!!document.querySelector('.post-detail .editorial-cover')", 'cover retained');
await click('点赞帖子'); await fill('[aria-label=评论内容]', '这条路线收藏了！'); await click('发送');
await check("document.querySelector('.post-detail-comments').textContent.includes('这条路线收藏了！')", 'comment displayed');
await shot('post-detail-cover'); await close();
await check("document.querySelector('.wall-post .wall-actions button').getAttribute('aria-pressed')==='true'", 'like synchronized');
await ev("[...document.querySelectorAll('.wall-sort button')].find(b=>b.textContent.includes('分享日常')).click()"); await wait();
await fill('#post-title','校园风景相册'); await fill('#post-text','傍晚散步时的校园，横图和竖图都要完整展示。');
await ev(`(async()=>{const dt=new DataTransfer();for(let i=0;i<3;i++){const c=document.createElement('canvas');c.width=i===1?300:900;c.height=i===1?900:450;const ctx=c.getContext('2d');ctx.fillStyle=['#669977','#997766','#667799'][i];ctx.fillRect(0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r));dt.items.add(new File([blob],'campus-'+i+'.png',{type:'image/png'}));}const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`); await wait(600);
await check("document.querySelectorAll('.upload-grid img').length===3", 'three uploads');
await click('发布到校园墙'); await wait(); await ev("document.querySelector('.wall-post .post-body-button').click()"); await wait(400);
await check("document.querySelectorAll('.post-detail-gallery img').length===3", 'all photos shown');
await ev("document.querySelector('.post-detail-gallery .ant-image').click()"); await wait(500);
await check("!!document.querySelector('.ant-image-preview')", 'preview opens');
await shot('post-photo-preview');
await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'}); await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'}); await wait(500);
for(const width of [320,390,430]){await resize(width);await check("document.querySelector('.post-detail').scrollWidth<=document.querySelector('.post-detail').clientWidth",width+' fits')}
await resize(390); await shot('post-detail-photos');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Post detail checks passed');
