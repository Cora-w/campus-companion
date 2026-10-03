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
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}




await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1500);await consent();await click('以学生身份体验 →');await click('首页');
await check("document.querySelectorAll('.campus-hub-entries>button').length===5",'five home entries');await click('查看商家推广');await check("document.querySelector('.merchant-promotion').textContent.includes('广告')",'promotion explicitly labelled');await shot('snack-home');
await click('查看商家推广：下课零食社');await wait(400);await check("!!document.querySelector('.snack-store-hero')",'promotion opens store');
await click('添加海盐脆薯片');await click('添加海盐脆薯片');await click('添加白桃乌龙茶');
await check("document.querySelector('.snack-cart-bar b').textContent==='¥18.00'",'accurate cart total');await shot('snack-store');await click('去结算');await wait(400);await click('减少海盐脆薯片');
await check("document.querySelector('.snack-total strong').textContent.includes('11.50')",'quantity recalculates total');await shot('snack-cart');
await ev("[...document.querySelectorAll('.snack-overlay button')].find(b=>b.textContent.includes('提交演示订单')).click()");await wait(400);
await check("!!document.querySelector('.snack-order-success') && document.querySelector('.snack-cart-bar b').textContent==='¥0.00'",'order created and cart emptied');
await ev("document.querySelector('.snack-topline button:last-child').click()");await wait(400);await check("document.querySelector('.snack-order').textContent.includes('11.50')",'order snapshot correct');
await ev("[...document.querySelectorAll('.snack-overlay.ant-drawer-open .ant-drawer-close')].at(-1).click()");await wait(400);
await click('‹ 全部店铺');await check("document.querySelectorAll('.snack-shop-card').length===3",'three merchants');await shot('snack-directory');
await click('进入小麦面包房');await click('添加黄油可颂');await click('‹ 全部店铺');await click('进入下课零食社');await check("document.querySelector('.snack-cart-bar b').textContent==='¥0.00'",'store carts isolated');
await click('‹ 全部店铺');await click('进入小麦面包房');await check("document.querySelector('.snack-cart-bar b').textContent==='¥8.00'",'cart retained on return');
await click('查看黄油可颂');await wait(400);await check("document.querySelector('.snack-product-detail').textContent.includes('小麦')",'product detail available');await click('继续选购');
await fill('[aria-label="搜索店内商品"]','不存在');await check("document.querySelector('.snack-products').children.length===0",'search empty state');await fill('[aria-label="搜索店内商品"]','');
await click('‹ 全部店铺');await click('进入晚自习补给站');await check("document.querySelector('[aria-label=添加黑巧克力]').disabled",'sold out cannot be added');
await ev("for(let i=0;i<15;i++)document.querySelector('[aria-label=添加海苔饭团]').click()");await wait();await check("document.querySelector('[aria-label=海苔饭团数量]').textContent==='7'",'stock cap respected');
for(const width of [320,390,430]){await resize(width);await check("document.querySelector('.snack-root .ant-drawer-body').scrollWidth<=document.querySelector('.snack-root .ant-drawer-body').clientWidth",width+' store fits')}
await ev("document.querySelector('.snack-root .ant-drawer-close').click()");await wait(400);await click('零食铺子');await wait(400);await check("document.querySelectorAll('.snack-shop-card').length===3",'standalone directory entry');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Snack shopping checks passed');
