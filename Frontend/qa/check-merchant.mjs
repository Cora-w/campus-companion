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

 if(/^以.+身份体验/.test(text)){await click('切换身份');await click(text.includes('心理教师')?'心理教师':text.includes('管理员')?'管理员':'学生');await click('演示账号 查看');await click('填入演示账号');text='登录'}

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






await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(2200);
const loginRole=async(role,id)=>{await click('切换身份');await click({student:'学生',merchant:'商家',teacher:'心理教师',admin:'管理员'}[role]);await fill('#login-account',id);await fill('#login-password','Demo@2026');await consent();await click('登录');await wait(500)};
await loginRole('student','S-DEMO-01');await click('首页');await click('零食铺子');await wait(400);await click('进入下课零食社');await click('添加海盐脆薯片');await click('去结算');await wait(400);await click('到店自提');await ev("[...document.querySelectorAll('.snack-overlay button')].find(b=>b.textContent.includes('提交演示订单')).click()");await wait(400);await ev("document.querySelector('.snack-root .ant-drawer-close').click()");await wait(400);await click('我的');await click('打开设置');await click('退出当前身份');await click('确认退出');
await loginRole('merchant','M-DEMO-01');await check("document.querySelector('.merchant-stats button b').textContent==='1'",'student order reaches merchant');await shot('merchant-home');await click('订单');await click('接单备货');await click('通知可自提（演示）');await check("document.querySelector('.merchant-card').textContent.includes('待自提')",'merchant order transitions');
await click('商品');await click('编辑海盐脆薯片');await wait(400);await fill('[aria-label=商品价格]','7.25');await click('保存商品');await check("document.querySelector('.merchant-area').textContent.includes('7.25')",'product price saved');await shot('merchant-products');
await ev("document.querySelector('[aria-label=上架每日坚果]').click()");await click('推广');await fill('[aria-label=推广标题]','下课零食社，新品到啦');await click('保存推广文案');
await click('我的');await fill('[aria-label=店铺简介]','课间零食，欢迎来逛');await click('保存店铺资料');await click('退出当前身份');
await loginRole('merchant','M-DEMO-02');await click('订单');await check("!document.querySelector('.merchant-card')",'other merchant cannot see first shop orders');await click('商品');await check("!document.querySelector('.merchant-area').textContent.includes('海盐脆薯片')",'merchant inventory scoped');await click('我的');await click('退出当前身份');
await loginRole('student','S-DEMO-01');await click('首页');await click('查看商家推广');await check("document.querySelector('.merchant-promotion').textContent.includes('新品到啦')",'promotion syncs to student');await click('零食铺子');await wait(400);await click('进入下课零食社');await check("document.querySelector('.snack-store-hero').textContent.includes('欢迎来逛')",'store details sync');await check("document.querySelector('.snack-products').textContent.includes('7.25')&&!document.querySelector('.snack-products').textContent.includes('每日坚果')",'price and delisting sync');await ev("document.querySelector('.snack-topline button:last-child').click()");await wait(400);await check("document.querySelector('.snack-order').textContent.includes('待自提')&&document.querySelector('.snack-order').textContent.includes('6.50')",'student sees updated order and original price snapshot');
if(browserErrors.length)throw Error(browserErrors.join(';'));ws.close();console.log('Merchant integration passed');
