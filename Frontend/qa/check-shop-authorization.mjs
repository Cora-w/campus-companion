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
  await call('Runtime.enable'); await call('Page.enable'); await resize(390)
  await call('Page.navigate',{url:'http://127.0.0.1:5183'}); await wait(1600)
  await ev("for(const id of ['S-DEMO-01','A-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await login('student'); await click('我的'); await check("!document.querySelector('[aria-label=管理店铺]')",'unauthorized student has no management entry'); await leave('student')
  await login('admin'); await click('开店授权'); await fits('authorization'); await shot('shop-authorization-mobile')
  await click('开店权限 S-DEMO-01'); await click('取消'); await check("document.querySelector('[aria-label=\"开店权限 S-DEMO-01\"]').getAttribute('aria-checked')==='false'",'cancel does not grant')
  await click('开店权限 S-DEMO-01'); await click('确认授权'); await check("document.querySelector('[aria-label=\"开店权限 S-DEMO-01\"]').getAttribute('aria-checked')==='true'",'student grant applied')
  await click('我的'); await click('操作记录'); await check("document.body.innerText.includes('授予学生开店权限 S-DEMO-01')",'grant audited'); await closeTop(); await leave('admin')
  await login('student'); await click('我的'); await check("!!document.querySelector('[aria-label=管理店铺]')&&document.querySelectorAll('.bottom-nav button').length===5",'authorized account stays student with entry'); await shot('shop-owner-profile')
  await click('管理店铺'); await fits('shop creation'); await click('创建店铺'); await check("document.body.innerText.includes('请填写店铺名称')",'shop details validated')
  await fill('#my-shop-name','小禾的小卖部'); await fill('#my-shop-location','第一食堂旁'); await click('创建店铺'); await check("document.body.innerText.includes('店铺已创建')",'student creates owned shop')
  await click('新增商品'); await click('保存商品'); await check("document.body.innerText.includes('请填写商品名称')",'product required fields validated')
  await fill('#my-product-name','测试果汁'); await fill('#my-product-price','6.50'); await fill('#my-product-stock','5'); await ev("document.querySelector('#my-product-stock').blur()"); await click('保存商品'); await check("document.querySelector('.shop-management').innerText.includes('测试果汁')&&document.querySelector('.shop-management').innerText.includes('库存 5')",'product saved'); await fits('product management'); await shot('shop-products-mobile')
  await closeTop(); await click('首页'); await click('零食铺子'); await check("document.body.innerText.includes('小禾的小卖部')",'shop listed for students')
  await click('进入小禾的小卖部'); await wait(400)
  await click('添加测试果汁'); await click('去结算'); await click('到店自提'); await click('提交演示订单 · ¥6.50'); await wait(400)
  await check("document.body.innerText.includes('已生成演示订单')",'owned-shop checkout works'); await closeTop(); await click('我的'); await click('管理店铺'); await click('订单'); await check("document.querySelector('.shop-management').innerText.includes('测试果汁')",'order routed to owner'); await click('接单备货'); await click('准备好自提'); await click('完成订单'); await check("document.querySelector('.shop-management').innerText.includes('已完成')",'owner completes order'); await shot('shop-orders-mobile'); await closeTop(); await leave('student')
  await login('admin'); await click('开店授权'); await click('开店权限 S-DEMO-01'); await click('确认收回'); await leave('admin')
  await login('student'); await click('我的'); await check("!document.querySelector('[aria-label=管理店铺]')",'revocation hides entry'); await click('首页'); await click('零食铺子'); await check("![...document.querySelectorAll('.snack-shop-card')].some(e=>e.innerText.includes('小禾的小卖部'))",'revoked shop hidden from directory'); await closeTop(); await leave('student')
  await login('admin'); await click('开店授权'); await click('开店权限 S-DEMO-01'); await click('确认授权'); await leave('admin')
  await login('student'); await click('我的'); await click('管理店铺'); await click('商品'); await check("document.querySelector('.shop-management').innerText.includes('测试果汁')&&document.querySelector('.shop-management').innerText.includes('库存 4')",'regrant retains shop and order inventory')
  if(errors.length)throw Error(errors.join('\n'))
  console.log('Student shop authorization flow passed')
} finally { ws.close() }
