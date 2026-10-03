import { writeFile } from 'node:fs/promises'
const targets=await (await fetch('http://127.0.0.1:9333/json')).json()
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map();const browserErrors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')browserErrors.push(JSON.stringify(m.params.exceptionDetails));if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}})
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






await call('Runtime.enable');await call('Page.enable');await resize(390,844);await call('Page.navigate',{url:'http://127.0.0.1:5174'});await wait(1500);await consent();await click('以学生身份体验 →');await click('发布');
await check("document.querySelector('.compose-setting').getBoundingClientRect().height>=50",'relaxed setting rows');
await check("document.querySelector('#post-text').getBoundingClientRect().height>=90",'larger writing area');
await shot('publish-balanced-layout');
await click('谁可以看');await check("document.querySelectorAll('.compose-visibility-options [role=radio]').length===3",'three audience choices');await shot('publish-visibility-options');await click('仅自己可见');
await check("document.querySelector('.compose-visibility-row').textContent.includes('仅自己可见')",'audience selection applied');
await fill('#post-title','私密范围验证');await fill('#post-text','只保留在我的发布里。');await click('存草稿');await click('发布');await check("document.querySelector('.compose-visibility-row').textContent.includes('仅自己可见')",'draft retains audience');
await click('预览');await check("document.querySelector('.compose-preview-author').textContent.includes('仅自己可见')",'preview matches scope');await click('确认发布');
await check("document.querySelector('.compact-post-list').textContent.includes('私密范围验证') && document.querySelector('.compact-post-list').textContent.includes('仅自己可见')",'private post is in own posts');await close();await click('首页');await check("!document.querySelector('.wall-feed').textContent.includes('私密范围验证')",'private post excluded from public wall');
await click('发布');await check("document.querySelector('.compose-visibility-row').textContent.includes('校园内同学')",'scope resets after publishing');await click('谁可以看');await click('仅好友可见');await fill('#post-title','好友范围验证');await fill('#post-text','仅向好友分享。');await click('发布给好友');await check("document.querySelector('.compact-post-list').textContent.includes('仅好友可见')",'friend post scope stored');await close();await click('首页');await check("!document.querySelector('.wall-feed').textContent.includes('好友范围验证')",'friend post excluded from public wall');
await click('发布');await fill('#post-title','公开范围验证');await fill('#post-text','校园内可见。');await click('发布到校园墙');await check("document.querySelector('.wall-feed').textContent.includes('公开范围验证')",'public post included on wall');
await click('发布');for(const [w,h] of [[390,844],[375,667],[320,568]]){await resize(w,h);await check("(()=>{const b=document.querySelector('.compose-publish-bar').getBoundingClientRect(),n=document.querySelector('.bottom-nav').getBoundingClientRect();return b.bottom<=n.top+1&&b.top>=0})()",'actions stay visible '+w+'x'+h);await check('document.documentElement.scrollWidth<=innerWidth','no overflow '+w)}
await resize(390,844);await shot('publish-balanced-layout');if(browserErrors.length)throw Error(browserErrors.join('\n'));ws.close();
