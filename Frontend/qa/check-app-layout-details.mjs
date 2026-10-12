import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://127.0.0.1:9350/json/new?about:blank', { method:'PUT' })).json()
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
  const expression = `(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(m=>m.getClientRects().length);const buttons=[...(modal||document).querySelectorAll('button')].filter(b=>b.getClientRects().length);const b=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b||b.disabled)throw Error('Missing or disabled: '+${JSON.stringify(text)});b.click()})()`
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
const widths = [320, 390, 430, 480, 966]
const fits = async label => {
  await check(`(()=>{const shell=document.querySelector('.teacher-shell-host,.admin-shell-host,.app-shell');const r=shell.getBoundingClientRect();return r.width<=Math.min(innerWidth,480)+1&&shell.scrollWidth<=shell.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth})()`,label+' shell fits')
  await check(`(()=>{const d=[...document.querySelectorAll('.ant-drawer-open')].at(-1);if(!d)return true;const r=d.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect();const expected=Math.min(innerWidth,480);const body=d.querySelector('.ant-drawer-body');return Math.abs(r.width-expected)<1&&Math.abs(r.left-(innerWidth-expected)/2)<1&&body.scrollWidth<=body.clientWidth+1&&[...d.querySelectorAll('input,textarea,.ant-select,.ant-drawer-footer button')].filter(e=>e.getClientRects().length).every(e=>{const b=e.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1})})()`,label+' drawer and controls fit')
}
const login = async (kind, account) => {
  await role(kind); await fill('#login-account',account); await fill('#login-password','Demo@2026');
  await ev("document.querySelector('.account-consent input').click()"); await wait(); await click('登录'); await wait(900)
}
const closeTop=async()=>{await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].filter(b=>b.getClientRects().length).at(-1).click()");await wait(500)}
const probe=async name=>{for(const width of [320,390,430,966]){await resize(width);await fits(name+' '+width)}await resize(390);await shot('layout-detail-'+name);await ev("(()=>{const body=[...document.querySelectorAll('.ant-drawer-open .ant-drawer-body')].at(-1);if(body)body.scrollTop=body.scrollHeight;else window.scrollTo(0,document.documentElement.scrollHeight)})()");await shot('layout-bottom-'+name);await ev("(()=>{const body=[...document.querySelectorAll('.ant-drawer-open .ant-drawer-body')].at(-1);if(body)body.scrollTop=0;else window.scrollTo(0,0)})()");console.log('VIEW '+name)}
const reset=async(kind,id)=>{await call('Page.navigate',{url:'http://127.0.0.1:5190'});await wait(1200);await login(kind,id)}
try{
await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5190'});await wait(1500);await shot('layout-login');await ev("for(const id of ['S-DEMO-01','A-DEMO-01','T-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')");await login('student','S-DEMO-01')
await ev("document.querySelector('[aria-label=搜索校园内容]').click()");await wait();await fill('[aria-label=校园搜索关键词]','校园');await probe('student-search');await closeTop();await click('管理首页分类');await probe('student-categories');await closeTop();await click('评论下课以后，去操场走两圈');await probe('student-post');await click('举报');await probe('student-report');await closeTop();await closeTop()
for(const label of ['校园指南','校园闲置','活动搭子','倾诉空间']){await click(label);await probe('student-'+label);await closeTop()}
await click('发现');await click('好玩');await click('查看校园摄影展');await probe('student-place');await closeTop();await click('我的');await click('编辑个人资料');await probe('student-edit-profile');await closeTop();await click('打开设置');await probe('student-settings');await closeTop();await click('帮助与反馈');await probe('student-help');await closeTop()
await click('消息');await click('通讯录');await probe('student-contacts');await closeTop();await click('新的朋友');await probe('student-friend-requests');await closeTop()
await reset('admin','A-DEMO-01');await ev("document.querySelector('[data-account-id=A-DEMO-01]').click()");await wait();await probe('admin-account');await click('编辑平台管理员');await probe('admin-account-edit');await closeTop();await closeTop();await click('开店授权');await ev("document.querySelector('[data-shop-account=S-DEMO-01]').click()");await wait();await probe('admin-shop-permission');await closeTop();await click('校园通知');await click('新建通知');await probe('admin-notice-edit');await closeTop();await click('反馈处理');await probe('admin-feedback');await click('帖子审核');await probe('admin-moderation');await click('查看全部公开帖');await click('审核帖子：下课以后，去操场走两圈');await probe('admin-post-review');await closeTop();await closeTop()
await reset('teacher','T-DEMO-01');await click('日程');await click('新增预约');await probe('teacher-booking-student');await ev("document.querySelector('[aria-label=预约学生]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");await wait();await ev("document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').click()");await wait();await click('下一步');await probe('teacher-booking-time');await click('下一步');await probe('teacher-booking-location')
if(errors.length)throw Error(errors.join('\n'));console.log('Extended layout checks passed')
}finally{ws.close()}
