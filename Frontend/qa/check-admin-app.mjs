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
  const expression = `(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(m=>m.getClientRects().length&&!m.classList.contains('ant-zoom-leave'));const buttons=[...(modal||document).querySelectorAll('button')].filter(b=>b.getClientRects().length);const b=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b||b.disabled)throw Error('Missing or disabled: '+${JSON.stringify(text)});b.click()})()`
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
try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Page.bringToFront'); await resize(390)
  await call('Page.navigate',{url:'http://127.0.0.1:5183'}); await wait(1500)
  await ev("for(const id of ['A-DEMO-01','S-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await role('admin'); await fill('#login-account','A-DEMO-01'); await fill('#login-password','Demo@2026'); await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(900)
  await check("document.querySelector('.admin-heading h1').innerText==='账号管理'",'admin opens directly at accounts')
  await check("[...document.querySelectorAll('.admin-sidebar nav button')].map(e=>e.innerText).join(',')==='账号管理,开店授权,校园通知,反馈处理,我的'",'five useful navigation entries')
  await check("!document.body.innerText.includes('登记账号')&&!document.querySelector('.admin-summary,.admin-matrix')",'unused overview matrix and registration removed')
  await check("document.querySelector('[aria-label=启用平台管理员]').disabled",'self disable prevented')
  await click('编辑陈老师'); await fill('#admin-account-name',''); await click('保存账号'); await check("document.body.innerText.includes('请填写显示名')",'edit validates name'); await fill('#admin-account-name','陈老师'); await close()
  await click('编辑李老师'); await select('账号身份角色','学生'); await click('保存账号'); await click('取消'); await check("!!document.querySelector('.ant-drawer-open')",'cancel role change leaves draft'); await click('保存账号'); await click('确认变更'); await check("document.querySelector('[data-account-id=\"T-DEMO-02\"]').innerText.includes('学生')",'role edit works')
  await click('启用陈老师'); await click('取消'); await check("document.querySelector('[aria-label=启用陈老师]').getAttribute('aria-checked')==='true'",'disable cancel does nothing')
  await click('启用陈老师'); await click('确认停用'); await check("document.querySelector('[aria-label=启用陈老师]').getAttribute('aria-checked')==='false'",'disable works')
  await fill('[aria-label=搜索账号]','missing'); await check("document.body.innerText.includes('没有匹配的账号')",'empty account search'); await click('清除筛选'); await shot('admin-simple-accounts')
  for(const width of [320,390,430,966]) {
    await resize(width)
    for(const tab of ['账号管理','开店授权','校园通知','反馈处理','我的']) {
      await click(tab); await check("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.admin-shell-host').scrollWidth<=document.querySelector('.admin-shell-host').clientWidth+1",width+'px '+tab+' fits')
      await check("Math.abs(document.querySelector('.admin-sidebar').getBoundingClientRect().width-Math.min(innerWidth,480))<1",width+'px navigation fits canvas')
    }
  }
  await resize(390); await click('开店授权'); await check("!!document.querySelector('.admin-shop-authorization')&&!document.querySelector('.admin-managed-shops')",'dedicated student permission page')
  await click('开店权限 S-DEMO-01'); await click('确认授权'); await click('我的'); await click('操作记录'); await fill('[aria-label=搜索操作日志]','授予学生开店权限 S-DEMO-01'); await check("document.querySelectorAll('.admin-records .admin-log-list article').length===1",'nested permission records filter')
  for(const width of [320,390,430,966]) { await resize(width); await check("document.querySelector('.admin-records .ant-drawer-body').scrollWidth<=document.querySelector('.admin-records .ant-drawer-body').clientWidth+1",width+'px records fits') }
  await resize(390); await shot('admin-permission-records'); await close(); await check("document.querySelector('.admin-heading h1').innerText==='我的'",'records returns to profile')
  if(errors.length)throw Error(errors.join('\n'))
  console.log('Simplified administrator app checks passed')
} finally { ws.close() }