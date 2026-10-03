import { writeFile } from 'node:fs/promises'
const target=await (await fetch('http://127.0.0.1:9441/json/new?about:blank',{method:'PUT'})).json()
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
const check=async(expression,label)=>{for(let n=0;n<40;n++){if(await ev(expression)){console.log('PASS '+label);return}await wait(100)}throw Error('Failed: '+label)}
const consent=async()=>{await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}

await call('Runtime.enable');await call('Page.enable');await resize(390,900);await call('Page.navigate',{url:'http://127.0.0.1:5186'});await wait(2500);await consent();await click('以学生身份体验 →');await click('发现');await click('好玩');await click('查看校园摄影展');
await check("document.querySelectorAll('.place-story').length===3",'all linked student stories');
await check("document.querySelector('.place-photo-count').textContent.includes('/ 3')",'carousel aggregates unique post photos');
await check("document.querySelector('.community-fullscreen .ant-drawer-content-wrapper').getBoundingClientRect().height>=innerHeight-2",'full height detail');
await check("!document.querySelector('.place-community').textContent.includes('沿河走到日落')",'other places excluded');
await click('下一张地点照片');await wait(700);await check("document.querySelector('.place-photo-count').textContent.startsWith('2')",'carousel next');await click('上一张地点照片');await wait(700);
await shot('place-community-390');
await ev("document.querySelector('.place-story-content').click()");await wait();await check("document.querySelector('.post-detail').textContent.includes('不用走远')",'source post opens');
await fill('[aria-label="评论内容"]','地点共创测试评论');await click('发送');await close();await check("document.querySelector('.place-story-actions button:nth-child(2)').textContent==='2'",'comment updates shared place feed');
await click('分享这里');await check("document.querySelector('#post-place-link').value==='place-3'",'share preselects place');
await fill('#post-title','地点共创测试分享');await fill('#post-text','这篇帖子应该同时出现在校园墙与摄影展地点页。');
await ev("new Promise(resolve=>{const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle='#40745a';x.fillRect(0,0,64,64);c.toBlob(blob=>{const d=new DataTransfer();d.items.add(new File([blob],'community-test.png',{type:'image/png'}));const e=document.querySelector('input[type=file][aria-label=添加分享图片]');e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));resolve(true)},'image/png')})");await wait(500);await click('发布到校园墙');
await check("document.querySelectorAll('.place-story').length===4",'new story joins same place');await check("document.querySelector('.place-photo-count').textContent.includes('/ 4')",'uploaded image joins carousel');
await ev("[...document.querySelectorAll('.place-community-feed-heading button')].find(b=>b.textContent==='最新').click()");await wait();await check("document.querySelector('.place-story h3').textContent==='地点共创测试分享'",'latest sorting');
await ev("document.querySelector('.place-story-actions button').click()");await wait();await close();await click('首页');
await check("[...document.querySelectorAll('.wall-post')].some(p=>p.textContent.includes('地点共创测试分享')&&p.querySelector('[aria-pressed=true]'))",'wall shares post and like state');
await click('发现');await click('好玩');await ev("document.querySelector('.discover-new-place').click()");await wait();
await fill('#post-title','小花园第一篇分享');await fill('#post-text','午后这里很安静，欢迎大家继续补充。');await click('发布到校园墙');await check("document.body.textContent.includes('请填写新地点的名称和具体地址')",'new place validates name and address');
await fill('[aria-label="新地点名称"]','测试北门花园');await fill('[aria-label="新地点地址"]','北门内侧花坛旁');await click('发布到校园墙');await check("document.querySelector('.place-community h1').textContent==='测试北门花园' && document.querySelectorAll('.place-story').length===1",'first student creates place with first post');
await click('分享这里');await fill('#post-title','另一篇花园分享');await fill('#post-text','同一个地点，新的体验。');await click('发布到校园墙');await check("document.querySelectorAll('.place-story').length===2",'any student can contribute to existing place');await close();
await check("[...document.querySelectorAll('.outing-card')].filter(p=>p.textContent.includes('测试北门花园')).length===1",'created place appears once in discovery');
await click('查看河畔步行道');for(const width of [320,430]){await resize(width,900);await check("document.querySelector('.community-fullscreen .ant-drawer-body').scrollWidth<=innerWidth",width+' community fits');await shot('place-community-'+width)}
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Place community checks passed');

