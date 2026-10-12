import { writeFile } from 'node:fs/promises'
const target=await (await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'})).json()
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
const consent=async()=>{await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}



await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1500);await consent();await click('以学生身份体验 →');await click('我的');
await check("!!document.querySelector('.personal-card')",'profile loads');
await click('编辑资料');await wait(500);await fill('[aria-label=网名]','测试同学');await fill('.profile-editor textarea','今天也要好好生活');await click('保存资料');await wait(500);await click('首页');await click('我的');await check("document.querySelector('.personal-bio').textContent==='今天也要好好生活'",'profile retained');

await check("!document.querySelector('.profile-creation') && !document.querySelector('.profile-menu').textContent.includes('通用设置')",'duplicate entries removed');
await click('编辑资料');await wait(500);await fill('[aria-label=真实姓名]','张同学');await fill('[aria-label=学号]','2026001234');
await ev("(async()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#407a50';ctx.fillRect(0,0,32,32);const blob=await new Promise(r=>canvas.toBlob(r));const dt=new DataTransfer();dt.items.add(new File([blob],'avatar.png',{type:'image/png'}));const input=document.querySelector('input[type=file][aria-label=上传头像文件]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");await wait(700);await check("!!document.querySelector('.profile-avatar-preview img')",'avatar upload preview');await click('保存资料');await wait(500);await check("!!document.querySelector('.personal-identity img')",'avatar saved');
await click('编辑资料');await wait(500);await fill('[aria-label=真实姓名]','未保存姓名');await close();await click('编辑资料');await wait(500);await check("document.querySelector('[aria-label=真实姓名]').value==='张同学'",'cancel preserves saved identity');await close();
await ev("document.querySelector('.profile-campus-pass').click()");await wait();await check("document.querySelector('.ant-drawer-open').textContent.includes('2026001234') && document.querySelector('.ant-drawer-open').textContent.includes('张同学')",'school identity saved separately');await close();
await click('草稿箱');await fill('#post-title','草稿测试');await click('我的');await click('草稿箱');await check("document.querySelector('#post-title').value==='草稿测试'",'resume draft');await click('我的');
await ev("document.querySelector('.personal-stats button:nth-child(3)').click()");await wait();await check("document.querySelector('.ant-drawer-open').textContent.includes('我赞过的')",'liked panel');await close();
await ev("document.querySelector('.profile-order-entry').click()");await wait();await check("document.querySelector('.ant-drawer-open').textContent.includes('还没有零食订单')",'order empty state');await close();
await click('帮助与反馈');await click('提出建议或反馈问题');await fill('.profile-editor textarea','希望增加更多校园服务');await click('提交反馈');await check("document.querySelector('.profile-feedback-item').textContent.includes('希望增加更多校园服务')",'feedback saved');await close();
await click('打开设置');await ev("document.querySelector('.profile-settings>button:not(.ant-btn)').click()");await wait();await click('确认清空');await click('退出当前身份');await click('取消');await close();
for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' fits');await shot('profile-'+width)}
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Profile checks passed');
