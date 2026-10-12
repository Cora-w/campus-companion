import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://127.0.0.1:9343/json/new?about:blank',{method:'PUT'})).json()
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
const shot = async name => { await wait(); await writeFile(`qa/screenshots/${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64')) }
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const close = async () => { await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500) }
const select = async (label, choice) => {
  await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await wait()
  await ev(`(()=>{const option=[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)});if(!option)throw Error('Missing option');option.click()})()`); await wait()
}
const appointmentAction = async (student, action) => { await ev(`(()=>{const card=[...document.querySelectorAll('.tw-appointment')].find(c=>c.innerText.includes(${JSON.stringify(student)}));const b=[...card.querySelectorAll('button')].find(b=>b.innerText.split(' ').join('').trim()===${JSON.stringify(action)});if(!b)throw Error('Missing appointment action');b.click()})()`); await wait() }
const login = async kind => {
  await role(kind); await fill('#login-account', kind === 'admin' ? 'A-DEMO-01' : 'S-DEMO-01'); await fill('#login-password','Demo@2026')
  await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1000)
}
const leave = async kind => {
  await click('我的')
  if(kind === 'admin') { await click('退出管理员账号'); await click('退出登录') }
  else { await click('打开设置'); await click('退出当前身份'); await click('确认退出') }
  await wait(500)
}
const closeTop = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(500) }
const fits = async label => {
  for(const width of [320,390,430,966]) {
    await resize(width)
    await check(`document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.ant-drawer-open .ant-drawer-body')].every(e=>e.scrollWidth<=e.clientWidth+1)`,label+' '+width+'px fits')
  }
  await resize(390)
}
try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Page.bringToFront'); await resize(390)
  await call('Page.navigate',{url:'http://127.0.0.1:5183'}); await wait(1500)
  await ev("for(const id of ['S-DEMO-01','A-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await login('admin')
  await check("[...document.querySelectorAll('.admin-sidebar nav button')].map(b=>b.innerText).join(',')==='账号管理,开店授权,校园通知,反馈处理,我的'",'five useful admin entries')
  for(const label of ['账号管理','开店授权','校园通知','反馈处理','我的']) { await click(label); await fits(label) }
  await click('开店授权'); await check("!!document.querySelector('[aria-label=\"开店权限 S-DEMO-01\"]')&&!document.querySelector('.admin-managed-shops')",'authorization page grants student permissions'); await shot('admin-five-authorization')
  await click('校园通知'); await click('新建通知'); await click('发布通知'); await check("document.body.innerText.includes('请填写通知标题')",'notice required fields')
  await fill('#campus-notice-title','周末校园服务提醒'); await fill('#campus-notice-body','本周末图书馆开放时间调整，请同学们留意。'); await fits('notice editor'); await click('保存草稿'); await wait(500); await check("document.querySelector('.campus-service-panel').innerText.includes('草稿')",'notice draft saved')
  await leave('admin'); await login('student'); await click('服务消息'); await check("!document.querySelector('.campus-student-notices').innerText.includes('周末校园服务提醒')",'draft hidden from students'); await closeTop()
  await click('我的'); await click('帮助与反馈'); await click('提出建议或反馈问题'); await fill('[aria-label=反馈内容]','零食订单页面希望增加取货时间说明。'); await click('提交反馈'); await check("document.querySelector('.feedback-form').innerText.includes('待处理')",'student feedback queued'); await closeTop(); await closeTop(); await leave('student')
  await login('admin'); await click('校园通知'); await click('编辑通知'); await click('发布通知'); await wait(500); await check("document.querySelector('.campus-service-panel').innerText.includes('已发布')",'notice published'); await shot('admin-five-notices')
  await click('反馈处理'); await check("document.querySelector('.campus-service-panel').innerText.includes('零食订单页面希望增加取货时间说明。')",'feedback reaches administrator'); await click('查看反馈'); await click('回复学生'); await check("document.body.innerText.includes('请填写回复内容')",'reply required'); await click('标记处理中'); await fill('#campus-feedback-reply','已收到建议，将在订单页补充取货时间说明。'); await fits('feedback editor'); await click('回复学生'); await wait(500); await check("document.querySelector('.campus-service-panel').innerText.includes('已回复')",'administrator replied'); await shot('admin-five-feedback')
  await leave('admin'); await login('student'); await click('服务消息'); await check("document.querySelector('.campus-student-notices').innerText.includes('周末校园服务提醒')",'published notice visible to students'); await fits('student notices'); await closeTop()
  await click('我的'); await click('帮助与反馈'); await click('提出建议或反馈问题'); await check("document.querySelector('.feedback-form').innerText.includes('已收到建议，将在订单页补充取货时间说明。')",'reply visible to submitting student'); await shot('student-feedback-reply'); await closeTop(); await closeTop(); await leave('student')
  await login('admin'); await click('校园通知'); await click('撤回通知'); await click('确认撤回'); await wait(500); await check("document.querySelector('.campus-service-panel').innerText.includes('草稿')",'notice withdrawn to draft'); await leave('admin')
  await login('student'); await click('服务消息'); await check("!document.querySelector('.campus-student-notices').innerText.includes('周末校园服务提醒')",'withdrawn notice disappears'); await closeTop(); await leave('student')
  await login('admin'); await click('校园通知'); await click('编辑通知'); await click('发布通知'); await wait(500); await leave('admin'); await login('student')
  await ev("localStorage.setItem('campus-school-v1:S-DEMO-01','another-school')"); await click('服务消息'); await check("!document.querySelector('.campus-student-notices').innerText.includes('周末校园服务提醒')",'notifications scoped to school'); await closeTop()
  await click('我的'); await click('帮助与反馈'); await click('提出建议或反馈问题'); await check("!document.querySelector('.feedback-form').innerText.includes('零食订单页面希望增加取货时间说明。')",'feedback scoped to school')
  await ev("localStorage.setItem('campus-school-v1:S-DEMO-01','sichuan-aerospace-polytechnic')")
  if(errors.length)throw Error(errors.join('\n'))
  console.log('Five-entry administrator notifications and feedback flow passed')
} finally { ws.close() }