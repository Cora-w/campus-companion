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

await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5186/qa/discover-preview.html'});await wait(2500);await click('好玩');
await check("document.querySelectorAll('.outing-card').length===2",'outings load');
for(const width of [320,390,430,1440]) {
  await resize(width,900);await ev('window.scrollTo(0,0)');await wait(400);
  await check('document.documentElement.scrollWidth<=innerWidth',width+' no horizontal overflow');
  await check("(()=>{const c=[...document.querySelectorAll('.outing-card')].map(e=>e.getBoundingClientRect());return Math.abs(c[0].top-c[1].top)<2&&c[1].left>c[0].left})()",width+' aligned grid');
  await shot('discover-play-redesign-'+width);
}
await resize(390,900);await click('收藏校园摄影展');await check("document.querySelector('.outing-save').getAttribute('aria-pressed')==='true'",'save place');
await ev("(()=>{const e=document.querySelector('[aria-label=去处类型]');e.value='展览';e.dispatchEvent(new Event('change',{bubbles:true}))})()");await wait();await check("document.querySelectorAll('.outing-card').length===1",'category filter');await click('周边');await check("document.querySelector('.discover-page').textContent.includes('没有找到')",'combined empty state');await click('清除筛选');
await click('查看校园摄影展');await check("document.querySelector('.ant-drawer-open').textContent.includes('艺术楼一层展厅')",'place details');await close();
await click('好吃');await shot('discover-food-redesign');await check("document.querySelectorAll('.discover-shop-card').length===4",'food retained');await click('查看一食堂 · 老汤面馆');
await check("(()=>{const r=document.querySelector('.discover-write-bar').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()",'write review visible');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Discover layout checks passed');



