import assert from 'node:assert/strict'

const target = await (await fetch(`http://127.0.0.1:${process.env.KEYBOARD_CDP_PORT || '9340'}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (!message.id) return
  const promise = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) promise.reject(message.error)
  else promise.resolve(message.result)
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
const wait = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms))
const click = async text => {
  assert.ok(await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.getClientRects().length&&e.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b)return false;b.click();return true})()`), text)
  await wait()
}
const fill = async (selector, value) => {
  await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await wait(100)
}
const snapshot = () => ev(`(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};return {header:rect('.hub-chat-root .ant-drawer-header'),composer:rect('.hub-chat-root .listen-composer'),market:rect('.campus-hub-root .ant-drawer-content-wrapper'),detail:rect('.product-detail-root .ant-drawer-content-wrapper'),transition:getComputedStyle(document.querySelector('.hub-chat-root .ant-drawer-content-wrapper')).transitionProperty}})()`)

try {
  await call('Page.enable')
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.testViewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{value:window.testViewport});window.keyboard=(height,offset=0)=>{Object.assign(window.testViewport,{height,offsetTop:offset});window.testViewport.dispatchEvent(new Event('resize'));window.testViewport.dispatchEvent(new Event('scroll'))}` })
  await call('Page.navigate', { url: process.env.MARKET_TEST_URL || 'http://127.0.0.1:5176' })
  await wait(1800)
  if (await ev("!!document.querySelector('#login-account')")) {
    await ev("document.querySelector('input[type=checkbox]').click()")
    await click('演示账号 查看')
    await click('填入演示账号')
    await click('登录')
    await wait(600)
  }
  if (await ev("!!document.querySelector('input[name=school]')")) {
    await ev("document.querySelector('input[name=school]').click()")
    await click('确认学校，进入校园')
  }
  await click('校园闲置')
  await ev("document.querySelector('.product-open').click()")
  await wait()
  await click('联系卖家 · 议价')
  await wait()
  const before = await snapshot()
  assert.equal(before.transition, 'transform')
  await fill('[aria-label=服务聊天消息]', '键盘测试草稿')
  await ev("document.querySelector('[aria-label=服务聊天消息]').focus()")
  // Sample during opening/closing, rather than waiting for the old height transition.
  for (const height of [820,760,690,600,480,600,690,760,820,844]) {
    await ev(`keyboard(${height})`)
    await wait(25)
    const current = await snapshot()
    assert.ok(Math.abs(current.header.top - before.header.top) < 2, `header stable at ${height}`)
    assert.ok(Math.abs(current.composer.bottom - height) < 2, `composer at keyboard ${height}`)
    assert.deepEqual(current.market, before.market)
    assert.deepEqual(current.detail, before.detail)
  }
  // Android adjustResize changes the layout viewport itself.
  for (const height of [760,640,480,640,760,844]) {
    await ev(`keyboard(${height})`)
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height, deviceScaleFactor: 1, mobile: true })
    await wait(40)
    const current = await snapshot()
    assert.ok(Math.abs(current.header.top - before.header.top) < 2, `Android header ${height}`)
    assert.ok(Math.abs(current.composer.bottom - height) < 2, `Android composer ${height}`)
    assert.deepEqual(current.market, before.market)
    assert.deepEqual(current.detail, before.detail)
  }
  assert.equal(await ev("document.querySelector('[aria-label=服务聊天消息]').value"), '键盘测试草稿')
  await ev('keyboard(480,35)')
  await wait(40)
  assert.ok(Math.abs((await snapshot()).composer.bottom - 515) < 2)
  await ev('keyboard(844)')
  await wait(40)
  await ev("document.querySelector('.hub-chat-root form').requestSubmit()")
  await wait()
  assert.ok(await ev("document.querySelector('.hub-chat-log').textContent.includes('键盘测试草稿')"))
  await ev('window.campusBack()')
  await wait()
  assert.ok(await ev("!!document.querySelector('.product-detail-root.ant-drawer-open')&&!document.querySelector('.hub-chat-root.ant-drawer-open')"))
  console.log('PASS market chat keyboard animation, Android resize, background stability, viewport pan, draft, send and back')
} finally {
  ws.close()
}
