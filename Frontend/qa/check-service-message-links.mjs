import { writeFile } from 'node:fs/promises'

const cdp = process.env.CAMPUS_QA_CDP || 'http://127.0.0.1:9335'
const url = process.env.CAMPUS_QA_URL || 'http://127.0.0.1:5173'
const target = await (await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener('message', event => {
  const result = JSON.parse(event.data)
  if (result.method === 'Runtime.exceptionThrown') errors.push(result.params.exceptionDetails.text)
  if (!result.id) return
  const request = pending.get(result.id)
  pending.delete(result.id)
  if (result.error) request.reject(result.error)
  else request.resolve(result.result)
})
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const next = ++id
  pending.set(next, { resolve, reject })
  ws.send(JSON.stringify({ id: next, method, params }))
})
const ev = async expression => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const wait = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))
const waitFor = async expression => {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await ev(expression)) return
    await wait(100)
  }
  throw Error('Timed out: ' + expression)
}
const check = async (label, expression) => {
  if (!await ev(expression)) throw Error(label)
  console.log('PASS ' + label)
}
const click = async selector => { await ev(`document.querySelector(${JSON.stringify(selector)}).click()`); await wait(450) }
const fill = async (selector, value) => {
  await ev(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await wait(100)
}
try {
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await call('Page.navigate', { url }); await waitFor("!!document.querySelector('#login-account')")
  await ev("localStorage.setItem('campus-login-school-v2','sichuan-aerospace-polytechnic');localStorage.setItem('campus-login-role-v1','student')")
  await call('Page.reload'); await wait(500); await waitFor("!!document.querySelector('#login-account')&&!document.querySelector('#login-account').disabled")
  await fill('#login-account', '20260001'); await fill('#login-password', 'Demo@2026')
  await click('.account-consent input'); await click('.account-submit'); await wait(1000)
  await click('[aria-label="服务消息"]')
  await check('three messages are marked as examples', "document.querySelectorAll('.service-message-card').length===3&&document.querySelector('.service-message-note').textContent.includes('示例')")
  await writeFile('qa/screenshots/service-message-links.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await click('.service-message-card')
  await check('comment opens the corresponding post and its comments', "document.querySelector('.post-detail').textContent.includes('先收藏这份食堂路线')&&document.querySelector('.post-detail').textContent.includes('想看早餐合集')")
  await ev("document.querySelector('.post-detail').closest('.ant-drawer').querySelector('.ant-drawer-close').click()"); await wait(500)
  await check('post back returns to the message list', "!document.querySelector('.post-detail')&&!!document.querySelector('.service-message-list')")
  await click('.service-message-card:nth-child(2)')
  await check('friend notification opens real incoming requests', "document.querySelectorAll('.friend-request-card').length===2&&document.querySelector('.friend-request-section').textContent.includes('收到的申请')")
  await click('.friend-request-card .ant-btn-primary')
  await check('request can be accepted', "document.querySelector('.friend-request-card').textContent.includes('已接受')")
  await ev('window.campusBack()'); await wait(500)
  await check('system back returns to service messages', "!document.querySelector('.friend-request-section')&&!!document.querySelector('.service-message-list')")
  await click('.service-message-card:nth-child(3)')
  await check('reopening preserves request status', "document.querySelector('.friend-request-card').textContent.includes('已接受')")
  await ev('window.campusBack()'); await wait(500)
  for (const width of [320, 430]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait()
    await check(width + ' messages fit the viewport', 'document.documentElement.scrollWidth<=innerWidth')
  }
  await ev('window.campusBack()'); await wait(500)
  await check('message list back returns to campus', "!document.querySelector('.ant-drawer-open .service-message-list')&&!!document.querySelector('.wall-feed')")
  if (errors.length) throw Error(errors.join('; '))
} finally {
  ws.close()
  await fetch(`${cdp}/json/close/${target.id}`)
}
