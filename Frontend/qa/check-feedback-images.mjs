import { writeFile } from 'node:fs/promises'
const target=await (await fetch('http://[::1]:9341/json/new?about:blank',{method:'PUT'})).json()
const ws=new WebSocket(target.webSocketDebuggerUrl)
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
const consent=async()=>{for(let n=0;n<100 && !await ev("!!document.querySelector('input[type=checkbox]')");n++)await wait(200);await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}




await call('Runtime.enable'); await call('Page.enable'); await resize(390);
await call('Page.navigate',{url:'http://127.0.0.1:5181'}); await wait(2000);
await ev('localStorage.clear();sessionStorage.clear()'); await call('Page.reload'); await wait(2000);
await consent(); await click('演示账号 查看'); await click('填入演示账号'); await click('登录');
for(let n=0;n<100;n++){if(await ev("!!document.querySelector('.wall-feed')"))break;if(await ev("!!document.querySelector('input[name=school]')")){await ev("document.querySelector('input[name=school]').click()");await wait();await click('确认学校，进入校园')}await wait(200)}
await click('我的');
await click('帮助与反馈'); await click('提出建议或反馈问题');
await check("document.querySelector('.feedback-form button[type=submit]').disabled",'empty feedback disabled');
const upload=async(mode,count=1)=>{await ev(`(async()=>{
const dt=new DataTransfer(); const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;canvas.getContext('2d').fillRect(0,0,200,100);
const blob=await new Promise(r=>canvas.toBlob(r));
for(let i=0;i<${count};i++)dt.items.add(new File([${mode==='large'?"new Uint8Array(5*1024*1024+1)":mode==='corrupt'?"'bad image'":"blob"}],'test.png',{type:${JSON.stringify(mode==='type'?'text/plain':'image/png')}}));
const input=document.querySelector('[aria-label=上传反馈图片]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(800)};
await upload('type');await check("document.querySelector('[role=alert]').textContent.includes('5MB')",'invalid type rejected');
await upload('large');await check("document.querySelectorAll('.feedback-image').length===0",'oversized rejected');
await upload('corrupt');await check("document.querySelector('[role=alert]').textContent.includes('无法读取')",'corrupt image rejected');
await upload('valid',2);await check("document.querySelectorAll('.feedback-image').length===2",'multiple image upload');
await click('删除反馈图片 1');await check("document.querySelectorAll('.feedback-image').length===1",'remove image');
await upload('valid',3);await check("document.querySelector('[role=alert]').textContent.includes('最多') && document.querySelectorAll('.feedback-image').length===1",'image limit rejected');
await click('保存本次反馈');await check("document.querySelectorAll('.profile-feedback-item img').length===1 && document.querySelector('.feedback-form button[type=submit]').disabled",'image-only saved and draft reset');
await fill('[aria-label=反馈内容]','截图说明反馈问题');await upload('valid',3);await shot('feedback-images');
await ev("document.querySelector('.feedback-attachments .ant-image').click()");await wait(500);
await check("!!document.querySelector('.ant-image-preview')",'image opens preview');
await ev("document.querySelector('.ant-image-preview-close').click()");await wait(500);
await click('保存本次反馈');await check("document.querySelectorAll('.profile-feedback-item')[0].textContent.includes('截图说明反馈问题') && document.querySelectorAll('.profile-feedback-item')[0].querySelectorAll('img').length===3",'text and all images saved');
await fill('[aria-label=反馈内容]','未保存草稿');await upload('valid');await close();await click('提出建议或反馈问题');await check("document.querySelector('[aria-label=反馈内容]').value==='未保存草稿' && document.querySelectorAll('.feedback-attachments img').length===1",'draft retained on reopen');
for(const width of [320,390,480]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' fits');}
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Feedback image checks passed');


