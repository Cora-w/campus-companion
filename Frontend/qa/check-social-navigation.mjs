import { writeFile } from 'node:fs/promises'
const targets=await (await fetch(process.env.CAMPUS_QA_CDP || 'http://127.0.0.1:9333/json')).json()
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
const consent=async()=>{for(let i=0;i<60&&!await ev("!!document.querySelector('input[type=checkbox]')");i++)await wait(100);await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}










await call('Runtime.enable'); await call('Page.enable'); await resize(390);
await call('Page.navigate',{url:process.env.CAMPUS_QA_URL || 'http://127.0.0.1:5173'}); await wait(1600);
await ev('localStorage.clear()'); await call('Page.reload'); await wait(1500);
await consent(); await fill('#login-account','S-DEMO-01'); await fill('#login-password','Demo@2026'); await click('登录'); await wait(900);
if(await ev("!!document.querySelector('input[name=school]')")){await ev("document.querySelector('input[name=school]').click()");await wait();await click('确认学校，进入校园');await wait(600)};
const nativeBack=async()=>{const handled=await ev('window.campusBack()');await wait(350);return handled};
for(let i=0;i<60;i++){if(await ev("!!document.querySelector('.wall-feed')"))break;if(await ev("!!document.querySelector('input[name=school]')")){await ev("document.querySelector('input[name=school]').click()");await wait();await click('确认学校，进入校园')}await wait(100)}await check("!!document.querySelector('.wall-feed')",'student home ready');
await ev('window.scrollTo(0,1200)'); await wait(); await check('window.scrollY>0','forum scrolled');
await click('刷新论坛并回到顶部'); await check('window.scrollY===0','one tap refresh returns to top');
await click('消息'); await ev("document.querySelector('.inbox-ai').click()"); await wait(400); await click('聊天更多功能');
await check('window.campusBack()===true','native back consumes chat settings'); await wait(350);
await check("!!document.querySelector('.conversation-root.ant-drawer-open')&&!document.querySelector('.chat-options-root.ant-drawer-open')",'first native gesture returns to AI chat');
await check('window.campusBack()===true','second native back consumes chat'); await wait(350);
await check("!!document.querySelector('.messenger')&&!document.querySelector('.conversation-root.ant-drawer-open')",'second gesture returns to inbox without exit');
await check('window.campusBack()===true','third native back returns home'); await wait(350);
await check("document.querySelector('.bottom-nav [aria-current=page]').getAttribute('aria-label')==='首页'&&window.campusBack()===false",'only home allows native exit');
await click('消息'); await click('添加好友或创建群聊');await ev("[...document.querySelectorAll('[role=menuitem]')].find(el=>el.textContent.includes('添加好友')).click()");await wait(); await check("document.querySelectorAll('.social-person-row').length===0",'no unsolicited people before search');await fill('[aria-label=搜索同学]','小林');await check("document.querySelector('.social-added').textContent.includes('已添加')&&!document.querySelector('.social-person-row button')",'existing friend shown as already added');await fill('[aria-label=搜索同学]','author-1');
await check("document.querySelectorAll('.ant-drawer-open .contact-item').length===1",'search by user ID finds classmate');
await ev("document.querySelector('.ant-drawer-open .contact-item button').click()");await wait(300);
await fill('#friend-request-message','想认识你，一起交流校园生活');await click('发送好友申请');
await check("document.querySelector('.friend-request-result').textContent.includes('一起交流校园生活')",'search entry sends friend request with note');
await check("!document.querySelector('.social-profile-content button')?.textContent.includes('发消息')&&document.querySelector('.social-request-status').textContent.includes('通过前不能发消息')",'outgoing request cannot bypass verification');await nativeBack();await check("!!document.querySelector('[aria-label=搜索同学]')&&!document.querySelector('.contact-profile')",'profile back restores search');
await fill('[aria-label=搜索同学]','no-such-person');await check("document.querySelector('.ant-drawer-open').textContent.includes('没有找到匹配')",'empty search result');await nativeBack();
await click('添加好友或创建群聊');await ev("[...document.querySelectorAll('[role=menuitem]')].find(el=>el.textContent.includes('创建群聊')).click()");await wait();await check("[...document.querySelectorAll('.ant-drawer-open button')].find(b=>b.textContent.includes('下一步')).disabled",'empty group cannot be created');
await ev("document.querySelector('[aria-label=邀请小林]').click()");await wait();await ev("document.querySelector('[aria-label=邀请周同学]').click()");await wait();await click('移除小林');await check("!document.querySelector('[aria-label=邀请小林]').checked&&document.querySelector('.social-flow-footer button').disabled",'removing member disables next step');await ev("document.querySelector('[aria-label=邀请小林]').click()");await wait();await click('下一步');await nativeBack();await check("document.querySelectorAll('.social-selected button').length===2",'confirmation back preserves members');await click('下一步');await fill('[aria-label=群聊名称]','下课一起玩');await click('创建群聊');
await check("document.querySelector('.conversation-root.ant-drawer-open .ant-drawer-title').textContent.includes('3人')",'standalone group opens with selected members');
await fill('[aria-label=群聊消息]','周末一起去看展');await ev("document.querySelector('.conversation-root.ant-drawer-open form').requestSubmit()");await wait(300);
await check("document.querySelector('[aria-label=群聊记录]').textContent.includes('周末一起去看展')",'group message appears');
await fill('[aria-label=群聊消息]','保留群聊草稿');await nativeBack();await check("document.querySelector('.inbox-filters [aria-pressed=true]').textContent==='群聊'&&document.querySelector('[aria-label=打开群聊下课一起玩]').textContent.includes('草稿')",'created group and draft appear in inbox');
await click('打开群聊下课一起玩');await check("document.querySelector('[aria-label=群聊消息]').value==='保留群聊草稿'",'group draft restored');
await click('聊天更多功能');await check('window.campusBack()===true','group settings consume native back');await wait(350);await nativeBack();
await ev('history.back()');await wait(650);await check("document.querySelector('.bottom-nav [aria-current=page]').getAttribute('aria-label')==='首页'",'mixed native and browser back returns home');
await click('发现');await click('首页');await check('window.campusBack()===false','home tab clears old page trail');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Social and native back checks passed');

