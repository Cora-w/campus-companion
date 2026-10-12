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
await call('Runtime.enable');await call('Page.enable');await resize(390);await reset('student','S-DEMO-01');await click('零食铺子');await probe('student-snack-directory');await ev("document.querySelector('.snack-shop-heading').click()");await wait();await probe('student-snack-shop');await ev("document.querySelector('.snack-quantity button').click()");await wait();await click('去结算');await probe('student-snack-checkout');await closeTop();await closeTop();await click('我的');await click('帮助与反馈');await click('提出建议或反馈问题');await probe('student-feedback-form');await closeTop();await click('我的约谈');await probe('student-invitations');await closeTop();await click('消息');await ev("document.querySelector('.conversation-row').click()");await wait();await probe('student-chat');
if(errors.length)throw Error(errors.join('\n'));console.log('Service layout checks passed')
}finally{ws.close()}
