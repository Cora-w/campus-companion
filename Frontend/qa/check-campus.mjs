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

await call('Runtime.enable');await call('Page.enable');await resize(390)
await call('Page.navigate',{url:'http://127.0.0.1:5173'});await wait(1600)
await consent();await click('以学生身份体验 →');await click('首页')
await check("document.querySelectorAll('.wall-post').length===6",'campus feed is student home')
await check("!document.querySelector('.trend-chart') && !document.body.innerText.includes('我的心理评估报告') && !document.querySelector('[aria-label=报告]')",'no student assessments or report navigation')
await shot('campus-home')
await click('管理首页分类');await ev("[...document.querySelectorAll('.category-choices label')].filter(e=>!e.querySelector('input').checked).forEach(e=>e.click())");await click('保存分类');await click('校园日常');await check("document.querySelectorAll('.wall-post').length===3",'daily life category')
await click('全部');await fill('input[aria-label="搜索校园墙"]','番茄牛肉面');await check("document.querySelectorAll('.wall-post').length===1",'feed search')
await fill('input[aria-label="搜索校园墙"]','不存在的词');await check("document.body.innerText.includes('还没有找到相关内容')",'feed empty state')
await click('查看全部动态');await click('发现');await check("document.querySelectorAll('.campus-place').length===2",'food discovery')
await click('好玩');await check("document.body.innerText.includes('校园摄影展')",'activity discovery')
await click('指南');await check("document.body.innerText.includes('快递怎么取')",'campus guide')
await click('好吃');await fill('input[aria-label="搜索校园服务"]','咖啡');await ev("document.querySelector('.place-detail-button').click()");await wait(500)
await click('收藏这个地点');await close();await shot('campus-discover')
await click('发布');await click('发布到校园墙');await check("document.body.innerText.includes('请填写标题')",'publish validation')
await fill('#post-title','校园生活测试分享');await fill('#post-text','一起发现好吃好玩的校园。');await fill('#post-location','图书馆')
await ev("(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const ctx=canvas.getContext('2d');ctx.fillStyle='#94ab83';ctx.fillRect(0,0,80,60);const data=atob(canvas.toDataURL('image/png').split(',')[1]);const bytes=Uint8Array.from(data,c=>c.charCodeAt(0));const file=new File([bytes],'campus-test.png',{type:'image/png'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");await wait(900)
await check("document.querySelectorAll('.upload-grid img').length===1",'local image preview')
await shot('campus-publish');await click('发布到校园墙');await check("document.querySelector('.wall-post h2').textContent==='校园生活测试分享'",'new post appears first')
await click('点赞校园生活测试分享');await check("document.querySelector('[aria-label=点赞校园生活测试分享]').getAttribute('aria-pressed')==='true'",'like state')
await click('收藏校园生活测试分享');await click('评论校园生活测试分享');await wait(500)
await check("document.querySelectorAll('.detail-photo').length===1",'published image in detail')
await fill('input[aria-label="评论内容"]','下次一起去');await click('发送');await check("document.body.innerText.includes('下次一起去')",'post comment')
await close();await click('我的');await click('我的收藏');await wait(500)
await check("document.body.innerText.includes('东门咖啡小馆') && document.body.innerText.includes('校园生活测试分享')",'places and posts collected')
await close();await click('消息');await ev("document.querySelector('.pinned').click()");await wait(500);await fill('input[aria-label="向小心发送消息"]','新生有什么好吃的');await click('发送');await wait(900)
await check("document.querySelector('.message.assistant').textContent.includes('按好评数')",'AI campus recommendation')
await fill('input[aria-label="向小心发送消息"]','PRIVATE-CAMPUS-CHAT');await click('发送');await wait(900)
await close();await click('首页')
for(const width of [320,390,430]){await resize(width);for(const p of ['首页','发现','发布','我的']){await click(p);await check('document.documentElement.scrollWidth<=innerWidth',width+' '+p+' no overflow');await check("!document.querySelector('.trend-chart')",width+' '+p+' no assessment chart')}}
await resize(390);await click('我的');await click('退出当前身份');await click('心理教师');await consent();await click('以心理教师身份体验 →');await click('预警')
await ev("document.querySelector('.case-card').click()");await wait(550);await click('阶段报告')
await check("document.querySelector('.ant-drawer-open').innerText.includes('授权报告摘要') && !!document.querySelector('.trend-chart')",'report and trends retained for teacher')
await check("!document.body.innerText.includes('PRIVATE-CAMPUS-CHAT')",'teacher never receives private chat')
await shot('campus-teacher-report');await close();await click('我的');await click('退出当前身份');await click('管理员');await consent();await click('以管理员身份体验 →');await click('权限')
await check("!document.querySelector('.trend-chart') && !document.querySelector('.case-card') && !document.body.innerText.includes('PRIVATE-CAMPUS-CHAT')",'admin has no case or private chat')
await click('我的');await click('退出当前身份');await click('学生');await consent();await click('以学生身份体验 →');await click('首页');await shot('campus-final')
if(browserErrors.length)throw Error('Browser runtime errors: '+browserErrors.join(';'))
console.log('All campus flow checks passed');ws.close()
