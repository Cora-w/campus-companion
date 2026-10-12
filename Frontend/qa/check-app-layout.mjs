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
try {
  await call('Runtime.enable'); await call('Page.enable'); await resize(390)
  await call('Page.navigate',{url:'http://127.0.0.1:5190'}); await wait(1000)
  await ev("localStorage.clear();for(const id of ['T-DEMO-01','S-DEMO-01','A-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await call('Page.reload'); await wait(900); await login('teacher','T-DEMO-01')
  for(const label of ['工作台','预警','学生','日程','我的']) {
    await click(label)
    for(const width of widths) { await resize(width); await fits('teacher '+label+' '+width) } await resize(390); await shot('layout-teacher-'+label)
  }
  await click('日程'); await click('新增预约')
  for(const width of widths) {
    await resize(width); await fits('booking '+width)

  }
  await resize(390); await shot('phone-booking-390'); await resize(966); await shot('phone-booking-desktop'); await close()
  await click('学生'); await ev("document.querySelector('.tw-student-card').click()"); await wait(500)
  for(const width of widths) { await resize(width); await fits('student detail '+width) }
  await close(); await click('工作台'); await click('教师服务提醒'); await wait(500)
  for(const width of widths) { await resize(width); await check("!!document.querySelector('.ant-drawer-open')",'inbox open'); await fits('teacher inbox '+width) }
  await close(); await call('Page.reload'); await wait(1000); await login('admin','A-DEMO-01')
  const labels=await ev("[...document.querySelectorAll('.admin-sidebar nav button')].map(b=>b.getAttribute('aria-label'))")
  for(const label of labels) {
    await click(label)
    for(const width of widths) { await resize(width); await fits('admin '+label+' '+width) } await resize(390); await shot('layout-admin-'+label)
  }
  await shot('phone-admin-desktop')
  await call('Page.reload'); await wait(1000); await login('student','S-DEMO-01')
  const tabs=await ev("[...document.querySelectorAll('.bottom-nav button')].map(b=>b.textContent.trim())")
  for(const label of tabs) { await click(label); for(const width of widths) { await resize(width); await fits('student '+label+' '+width) } await resize(390); await shot('layout-student-'+label) }
  if(errors.length)throw Error(errors.join('\n'))
  console.log('All phone layout checks passed')
} finally { ws.close() }
