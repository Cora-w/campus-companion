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
const check=async(expression,label)=>{for(let n=0;n<40;n++){if(await ev(expression)){console.log('PASS '+label);return}await wait(100)}throw Error('Failed: '+label)}
const consent=async()=>{await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}



await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5174'});await wait(3000);await consent();await click('以学生身份体验 →');await click('发现');
await check("document.querySelectorAll('.discover-shop-card').length===4",'four shops');
await check("!document.querySelector('.discover-page').textContent.includes('校园服务')",'duplicate services removed');
for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+' page fits');await shot('discover-'+width)}
await fill('[aria-label="搜索发现"]','生椰');await check("document.querySelectorAll('.discover-shop-card').length===1",'search matches products');
await fill('[aria-label="搜索发现"]','不存在的店');await check("document.querySelector('.discover-page').textContent.includes('没有找到')",'empty result');await click('清除筛选');
await click('校内');await check("document.querySelectorAll('.discover-shop-card').length===2",'area filter');await click('全部');
await click('查看一食堂 · 老汤面馆');await check("document.querySelector('.discover-detail').textContent.includes('第一食堂二楼 06 窗口')",'address visible');
await check("document.querySelector('.discover-products button h3').textContent==='番茄牛肉面'",'popular product first');await shot('discover-shop');
await check("(()=>{const r=document.querySelector('.discover-write-bar').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()",'write entry visible without scrolling');
await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop=9999");await wait();
await check("(()=>{const r=document.querySelector('.discover-write-bar').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()",'write entry stays visible after scrolling');
await click('写评价');await fill('[aria-label="探店评价"]','店铺测试：出餐快，位置好找');await check("document.querySelector('.discover-review-form button[type=submit]').disabled",'rating required');
await ev("document.querySelectorAll('.discover-review-form [role=radio]')[4].click()");await wait();await click('发布评价');
await check("document.querySelector('.discover-reviews').textContent.includes('店铺测试：出餐快')",'shop review published');
await ev("[...document.querySelectorAll('.discover-review-tabs button')].find(b=>b.textContent.includes('商品评价')).click()");await wait();await check("!document.querySelector('.discover-reviews').textContent.includes('店铺测试')",'shop review excluded from product reviews');
await click('写评价');await check("!!document.querySelector('#discover-review-target') && document.querySelector('#discover-review-target').value===''",'aggregate reviews offers product selection');
await shot('discover-write');await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()");await wait(500);
await ev("document.querySelector('.discover-product-info').click()");await wait();await check("document.querySelector('.discover-detail h2').textContent==='番茄牛肉面'",'product detail');
await click('写评价');await fill('[aria-label="探店评价"]','商品测试：汤底酸甜，建议少盐');await ev("document.querySelectorAll('.discover-review-form [role=radio]')[3].click()");await wait();await click('发布评价');
await check("document.querySelector('.discover-reviews').textContent.includes('商品测试') && !document.querySelector('.discover-reviews').textContent.includes('店铺测试')",'product review scoped');
await ev("document.querySelector('.discover-detail-actions button').click()");await wait();await check("document.querySelector('.discover-detail-actions button').getAttribute('aria-pressed')==='true'",'product like toggled');await shot('discover-product');
await click('返回 一食堂 · 老汤面馆');await check("document.querySelector('.discover-reviews').textContent.includes('商品测试')",'product review appears in aggregate');
await ev("[...document.querySelectorAll('.discover-review-tabs button')].find(b=>b.textContent.includes('店铺评价')).click()");await wait();await check("!document.querySelector('.discover-reviews').textContent.includes('商品测试')",'product review excluded from shop reviews');
for(const width of [320,430]){await resize(width);await check("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollWidth<=innerWidth",width+' detail fits')}
await close();await ev("[...document.querySelectorAll('.discover-tabs button')].find(b=>b.textContent.startsWith('好玩')).click()");await wait();await check("document.querySelectorAll('.discover-outings>.outing-card').length===2",'outings retained');
await call('Page.reload');await wait(1200);await consent();await click('以学生身份体验 →');await click('发现');await click('查看一食堂 · 老汤面馆');await check("document.querySelector('.discover-reviews').textContent.includes('店铺测试')",'review survives reload');
await ev("document.querySelector('.discover-product-info').click()");await wait();await check("document.querySelector('.discover-detail-actions button').getAttribute('aria-pressed')==='true'",'like survives reload');await check("document.querySelector('.discover-reviews').textContent.includes('商品测试')",'product review survives reload');
await ev("Object.keys(localStorage).filter(k=>k.startsWith('campus-discover-feedback-v1:')).forEach(k=>localStorage.removeItem(k))");
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Discover checks passed');

