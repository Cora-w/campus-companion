import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://[::1]:9351/json/new?about:blank',{method:'PUT'})).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map(), errors = []
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails))
  if (message.id) { const promise = pending.get(message.id); pending.delete(message.id); if (message.error) promise.reject(message.error); else promise.resolve(message.result) }
})
const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) })
const ev = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
const wait = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))
const check = async (expression, label) => { if (!await ev(expression)) throw Error(label); console.log('PASS ' + label) }
const click = async text => {
  const expression = `(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(m=>m.getClientRects().length&&!m.classList.contains('ant-zoom-leave'));const buttons=[...(modal||document).querySelectorAll('button')].filter(b=>b.getClientRects().length);const b=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b||b.disabled)throw Error('Missing or disabled: '+${JSON.stringify(text)});b.click()})()`
  await ev(expression); await wait()
}
const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
const role = async value => { await click('切换身份⌄'); await ev(`(()=>{const names={student:'学生',teacher:'心理教师',admin:'管理员'};const item=[...document.querySelectorAll('.ant-dropdown-menu-item')].find(item=>item.innerText===names[${JSON.stringify(value)}]);if(!item)throw Error('Missing role');item.click()})()`); await wait() }
const shot = async name => { await call('Page.bringToFront'); await wait(); await writeFile(`qa/screenshots/${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64')) }
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const close = async () => { await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500) }
const select = async (label, choice) => {
  await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await wait()
  await ev(`(()=>{const option=[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)});if(!option)throw Error('Missing option');option.click()})()`); await wait()
}
const appointmentAction = async (student, action) => { await ev(`(()=>{const card=[...document.querySelectorAll('.tw-appointment')].find(c=>c.innerText.includes(${JSON.stringify(student)}));const b=[...card.querySelectorAll('button')].find(b=>b.innerText.split(' ').join('').trim()===${JSON.stringify(action)});if(!b)throw Error('Missing appointment action');b.click()})()`); await wait() }
const login = async (kind,account) => { await role(kind); await select('登录学校','四川航天职业技术学院'); await fill('#login-account',account); await fill('#login-password','Demo@2026'); await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1000) }
const studentExit = async () => { await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(500) }
const closeTop = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].filter(b=>b.getClientRects().length).at(-1).click()"); await wait(500) }

const tab=async label=>{await ev("[...document.querySelectorAll('.bottom-nav button')].find(b=>b.getAttribute('aria-label')==="+JSON.stringify(label)+").click()");await wait()}
const fits=async label=>{await check('document.documentElement.scrollWidth<=innerWidth',label+' page fits');await check("(()=>{const d=[...document.querySelectorAll('.ant-drawer-open')].at(-1);if(!d)return true;const w=d.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect(),b=d.querySelector('.ant-drawer-body');return w.width<=Math.min(innerWidth,480)+1&&b.scrollWidth<=b.clientWidth+1})()",label+' overlay fits')}
const staffClose=async()=>{await ev('window.campusBack()');await wait(600)}

const enter=async()=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13})};
const comments=()=>ev("document.querySelectorAll('.post-detail-comments .campus-comment').length");
const openPost=async()=>{await ev("[...document.querySelectorAll('.wall-post')].find(p=>p.textContent.includes('下课以后，去操场走两圈')).querySelector('.post-body-button').click()");await wait(500)};
try{
await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.bringToFront');await call('Page.navigate',{url:'http://127.0.0.1:5191'});await wait(1400);await ev('localStorage.clear()');await call('Page.reload');await wait(700);
for(const [kind,account] of [['student','20260001'],['teacher','20261001'],['admin','20262001']]){
await login(kind,account);await openPost();const before=await comments();
await fill('[aria-label=评论内容]',kind+'回车发送动画');await ev("document.querySelector('[aria-label=评论内容]').focus()");await ev("window.commentKeyEvents=[];document.addEventListener('keydown',e=>window.commentKeyEvents.push({key:e.key,code:e.keyCode,prevented:e.defaultPrevented}));document.querySelector('.post-detail-composer').addEventListener('submit',()=>window.commentKeyEvents.push('submit'))");await enter();await wait(100);console.log('ENTER',before,await comments(),await ev("({events:window.commentKeyEvents,draft:document.querySelector('[aria-label=评论内容]').value,disabled:document.querySelector('.comment-send-button').disabled,focused:document.activeElement.getAttribute('aria-label')})"));
await check(await comments()===before+1?'true':'false',kind+' Enter adds one comment');await check("document.querySelector('.comment-send-status').textContent==='评论已发送' && document.querySelector('.comment-send-button').textContent.includes('已发送')",kind+' committed comment has receipt');await check("document.querySelector('[aria-label=评论内容]').value==='' && document.activeElement===document.querySelector('[aria-label=评论内容]')",kind+' draft clears and focus stays');
await check("getComputedStyle(document.querySelector('.campus-comment:last-child')).animationName==='comment-arrive' && [...document.querySelectorAll('.campus-comment')].filter(c=>!c.classList.contains('comment-just-sent')).every(c=>getComputedStyle(c).animationName==='none')",kind+' only new comments animate');await wait(700);
await check("(()=>{const r=document.querySelector('.campus-comment:last-child').getBoundingClientRect(),f=document.querySelector('.post-detail-composer').getBoundingClientRect(),b=document.querySelector('.post-detail').closest('.ant-drawer-body').getBoundingClientRect();return r.bottom<=Math.min(f.top,b.bottom)+2 && r.top>=b.top-2})()",kind+' comment visible above composer');
await ev("document.querySelector('[aria-label=评论内容]').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'拼'}))");await fill('[aria-label=评论内容]',kind+'中文选字测试');await enter();await wait(150);await check(await comments()===before+1?'true':'false',kind+' IME confirmation does not submit');await ev("document.querySelector('[aria-label=评论内容]').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'拼'}))");await enter();await wait(150);await check(await comments()===before+2?'true':'false',kind+' Enter works after composition');
await fill('[aria-label=评论内容]',kind+'快速发送测试');await ev("for(let i=0;i<8;i++)document.querySelector('.post-detail-composer').requestSubmit()");await wait(180);await check(await comments()===before+3?'true':'false',kind+' repeated submits do not duplicate');await fill('[aria-label=评论内容]','   ');await ev("document.querySelector('.post-detail-composer').requestSubmit()");await wait(150);await check(await comments()===before+3?'true':'false',kind+' whitespace is ignored');
await fill('[aria-label=评论内容]',kind+'点击发送测试');await click('发送');await check(await comments()===before+4?'true':'false',kind+' click matches Enter feedback');if(kind==='student'){await shot('comment-send-390');for(const width of [320,430]){await resize(width);await fits('comment composer '+width)}}
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await fill('[aria-label=评论内容]',kind+'减少动态效果测试');await click('发送');await check("getComputedStyle(document.querySelector('.campus-comment:last-child')).animationName==='none' && document.querySelector('.comment-send-status').textContent==='评论已发送'",kind+' reduced motion keeps receipt');await call('Emulation.setEmulatedMedia',{features:[]});await wait(1800);await check("document.querySelector('.comment-send-button').textContent.replaceAll(' ','')==='发送' && document.querySelector('.comment-send-status').textContent===' ' .trim()",kind+' receipt resets');
await ev('window.campusBack()');await wait(450);await openPost();await check("!document.querySelector('.comment-just-sent') && !document.querySelector('.comment-send-status').textContent",kind+' reopening does not animate old comments');await ev('window.campusBack()');await wait(450);await studentExit();await resize(390);
}
if(errors.length)throw Error(errors.join('\n'));console.log('Comment motion checks passed');
}finally{ws.close()}
