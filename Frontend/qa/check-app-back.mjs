import { writeFile } from 'node:fs/promises'
const targets = await (await fetch('http://127.0.0.1:9342/json')).json()
const ws = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
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
  const expression = `(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(m=>m.getClientRects().length);const buttons=[...(modal||document).querySelectorAll('button')].filter(b=>b.getClientRects().length);const b=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b||b.disabled)throw Error('Missing or disabled: '+${JSON.stringify(text)});b.click()})()`
  await ev(expression); await wait()
}
const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
const role = async value => { await click('切换身份⌄'); await ev(`(()=>{const names={student:'学生',teacher:'心理教师',admin:'管理员'};const item=[...document.querySelectorAll('.ant-dropdown-menu-item')].find(item=>item.innerText===names[${JSON.stringify(value)}]);if(!item)throw Error('Missing role');item.click()})()`); await wait() }
const shot = async name => { await wait(); await writeFile(`qa/screenshots/${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64')) }
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const close = async () => { await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500) }
const select = async (label, choice) => {
  await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await wait()
  await ev(`(()=>{const option=[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)});if(!option)throw Error('Missing option');option.click()})()`); await wait()
}
const appointmentAction = async (student, action) => { await ev(`(()=>{const card=[...document.querySelectorAll('.tw-appointment')].find(c=>c.innerText.includes(${JSON.stringify(student)}));const b=[...card.querySelectorAll('button')].find(b=>b.innerText.split(' ').join('').trim()===${JSON.stringify(action)});if(!b)throw Error('Missing appointment action');b.click()})()`); await wait() }
const swipe = async (x=8,y=220,dx=120,dy=0) => {
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
  await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx/2,y:y+dy/2}]})
  await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]})
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await wait(600)
}
const login = async kind => {
  await role(kind); await fill('#login-account',kind==='teacher'?'T-DEMO-01':kind==='admin'?'A-DEMO-01':'S-DEMO-01'); await fill('#login-password','Demo@2026')
  await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1200)
}
try {
  await call('Runtime.enable'); await call('Page.enable'); await resize(390)
  await call('Emulation.setTouchEmulationEnabled',{enabled:true})
  await call('Page.navigate',{url:'http://127.0.0.1:5182'}); await wait(1000)
  await ev("localStorage.setItem('campus-school-v1:T-DEMO-01','sichuan-aerospace-polytechnic');localStorage.setItem('campus-school-v1:S-DEMO-01','sichuan-aerospace-polytechnic')")
  await call('Page.reload'); await wait(1000); await login('teacher')
  await click('学生'); await ev("document.querySelector('.tw-student-card').click()"); await wait(500)
  await check("!!document.querySelector('.ant-drawer-open button[aria-label=\"返回上一页\"]')",'drawer has a labeled back arrow')
  await click('服务记录'); await click('约谈该学生')
  await check("!!document.querySelector('.tw-booking-drawer')",'nested booking opens')
  await swipe(); await check("!document.querySelector('.ant-drawer-open.tw-booking-drawer')&&!!document.querySelector('.teacher-detail')",'edge swipe returns from booking to student detail')
  await swipe(120,220,120); await check("!!document.querySelector('.teacher-detail')",'middle-page swipe does not trigger back')
  await swipe(8,220,5,110); await check("!!document.querySelector('.teacher-detail')",'vertical scrolling does not trigger back')
  await swipe(); await check("!document.querySelector('.ant-drawer-open')&&!!document.querySelector('.tw-student-card')",'second swipe returns to student list')
  await click('返回上一页'); await check("!!document.querySelector('.tw-priority-banner')",'page arrow returns to actual previous page')
  await ev('window.campusBack()'); await check("!!document.querySelector('.tw-priority-banner')&&!document.querySelector('#login-account')",'root back keeps account and app open')
  await click('教师服务提醒'); await ev("document.querySelector('.tw-notice-section .tw-task').click()"); await wait(450)
  await swipe(); await check("!!document.querySelector('.ant-drawer-open .tw-notice-section')&&!document.querySelector('.teacher-detail')",'student alert detail returns to its reminder origin')
  await swipe(); await check("!document.querySelector('.ant-drawer-open')&&!!document.querySelector('.tw-priority-banner')",'reminder back returns to workbench')
  await click('学生'); await ev("document.querySelector('.tw-student-card').click()"); await wait(400); await click('去复核'); await fill('#review-note','返回保护测试')
  await swipe(); await check("document.body.innerText.includes('放弃未保存的内容？')",'swipe protects unsaved work')
  await ev('window.campusBack()'); await wait(400); await check("!document.querySelector('.ant-modal-confirm')&&document.querySelector('#review-note').value==='返回保护测试'",'system back cancels confirmation and preserves draft')
  await close(); await click('放弃修改'); await click('我的'); await click('退出教师账号'); await login('student')
  await click('消息'); await click('通讯录'); await ev("document.querySelector('.contact-item button').click()"); await wait(500)
  await swipe(); await check("!!document.querySelector('.contact-panel')&&document.body.innerText.includes('通讯录')",'student chat swipe returns to its contact-list origin')
  await swipe(); await check("!document.querySelector('.ant-drawer-open')&&!!document.querySelector('.messenger-tools')",'contact-list swipe returns to messages')
  await click('返回上一页'); await check("!!document.querySelector('.wall-feed')",'student page back returns to campus home')
  await ev('history.back()'); await wait(500); await check("!!document.querySelector('.wall-feed')&&!document.querySelector('#login-account')",'browser back at student root keeps app open')
  await click('发现'); await click('好玩'); await click('查看校园摄影展'); await ev("document.querySelector('.place-story-content').click()"); await wait(400)
  await swipe(); await check("!!document.querySelector('.place-community')",'post swipe returns to its discovery place')
  await ev('window.campusBack()'); await wait(500); await check("!document.querySelector('.ant-drawer-open')",'place back returns to discovery')
  await click('返回上一页'); await click('零食铺子'); await click('进入下课零食社'); await click('添加海盐脆薯片'); await click('去结算')
  await ev('window.campusBack()'); await wait(500); await check("!!document.querySelector('.snack-root.ant-drawer-open')&&!document.querySelector('.snack-overlay.ant-drawer-open')",'checkout back returns to store')
  await ev('window.campusBack()'); await wait(500); await check("document.querySelector('.snack-root .ant-drawer-title').textContent==='零食铺子'",'store back returns to shop directory')
  await ev('window.campusBack()'); await wait(500); await check("!document.querySelector('.ant-drawer-open')",'shop directory back returns to campus')
  await click('我的'); await click('打开设置'); await ev("[...document.querySelectorAll('.profile-settings button')].find(x=>x.textContent.includes('账号与')).click()"); await wait(350)
  await ev('window.campusBack()'); await wait(500); await check("!!document.querySelector('.profile-settings')&&document.querySelectorAll('.ant-drawer-open').length===1",'account identity back returns to settings')
  await click('退出当前身份'); await ev('window.campusBack()'); await wait(500); await check("!!document.querySelector('.profile-settings')&&!document.querySelector('.ant-modal-wrap:not([style*=none])')",'back cancels logout rather than leaving account')
  await ev('window.campusBack()'); await wait(450); await click('返回上一页')
  await call('Page.reload'); await wait(1000); await check("!!document.querySelector('#login-account')",'refresh starts on login')
  await ev("localStorage.setItem('campus-school-v1:A-DEMO-01','sichuan-aerospace-polytechnic')"); await login('admin')
  await click('账号管理'); await click('编辑陈老师'); await swipe(); await check("!document.querySelector('.ant-drawer-open')&&!!document.querySelector('.admin-toolbar')",'admin editor swipe returns to account list')
  await check("!document.querySelector('.admin-topbar [aria-label=返回上一页]')&&document.querySelector('.admin-heading h1').textContent==='账号管理'",'admin root has no back arrow')
  await ev('window.campusBack()'); await check("!!document.querySelector('.admin-workspace')&&!document.querySelector('#login-account')",'admin root back keeps account open')
  await call('Page.reload'); await wait(1000); await check("!!document.querySelector('#login-account')",'app finishes at login entry')
  if(errors.length) throw Error(errors.join('\n'))
  console.log('APP back navigation checks passed')
} finally { ws.close() }