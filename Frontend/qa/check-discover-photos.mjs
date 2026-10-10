import assert from 'node:assert/strict'
const target = await (await fetch('http://127.0.0.1:9442/json/new?about:blank', { method:'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once:true }))
let id = 0
const pending = new Map()
const errors = []
const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id:n, method, params })) })
ws.addEventListener('message', async event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  // Keep interaction checks independent of external photo availability.
  if (message.method === 'Fetch.requestPaused') await call('Fetch.fulfillRequest', { requestId:message.params.requestId, responseCode:200, responseHeaders:[{ name:'Content-Type', value:'image/svg+xml' }], body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#a77d55"/></svg>').toString('base64') })
  if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(message.error) : p.resolve(message.result) }
})
const wait = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms))
const ev = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
const check = async (expression, label) => { for (let i=0;i<30;i++) { if (await ev(expression)) { console.log('PASS '+label); return } await wait(100) } throw Error(label) }
const click = async selector => { await ev(`document.querySelector(${JSON.stringify(selector)}).click()`); await wait() }
try {
  await call('Runtime.enable')
  await call('Fetch.enable', { patterns:[{ urlPattern:'https://images.unsplash.com/*' }] })
  await call('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true })
  await call('Page.navigate', { url:'http://127.0.0.1:5186/qa/discover-preview.html' }); await wait(1500)
  await click('.discover-cover .discover-photo-trigger')
  await check("!!document.querySelector('.ant-image-preview-img') && !document.querySelector('.ant-drawer-open')", 'list photo opens preview directly')
  await ev("document.querySelector('.ant-image-preview-close').click()"); await wait()
  await click('[aria-label="查看麦香烘焙屋"]')
  await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop=70")
  const scroll = await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop")
  await check("getComputedStyle(document.querySelector('.discover-detail-cover img')).objectFit==='cover'", 'detail cover fills banner')
  await check("document.querySelector('.discover-detail-cover').getBoundingClientRect().height<=240 && !document.querySelector('.discover-photo-backdrop')", 'detail photo has compact banner without backdrop')
  await check("document.querySelector('.discover-detail-cover .discover-photo-hint').getBoundingClientRect().bottom<=document.querySelector('.discover-detail-cover img').getBoundingClientRect().bottom", 'photo hint sits inside banner')
  await click('.discover-detail-cover .discover-photo-trigger')
  await check("!!document.querySelector('.ant-image-preview-img')", 'detail cover opens preview above drawer')
  await click('.ant-image-preview-actions-action-zoomIn')
  await check("document.querySelector('.ant-image-preview-img').style.transform.includes('scale3d(1.5')", 'zoom increases scale')
  await click('.ant-image-preview-switch-next')
  await check("document.querySelector('.discover-preview-caption')?.textContent==='海盐黄油卷'", 'switch to product image')
  await call('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27 }); await wait(500)
  await check("!document.querySelector('.ant-image-preview') && !!document.querySelector('.ant-drawer-open')", 'Escape closes only preview')
  assert.equal(await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop"), scroll)
  console.log('PASS drawer scroll preserved')
  await click('.discover-product-row .discover-photo-trigger')
  await check("document.querySelector('.discover-preview-caption')?.textContent==='海盐黄油卷' && document.querySelector('.discover-detail h2').textContent==='麦香烘焙屋'", 'product thumbnail previews correct image without navigating')
  await click('.ant-image-preview-close')
  await click('.discover-product-info')
  await check("document.querySelector('.discover-detail h2').textContent==='海盐黄油卷'", 'product text still opens detail')
  await click('.discover-detail-cover .discover-photo-trigger')
  await check("document.querySelector('.discover-preview-caption')?.textContent==='海盐黄油卷'", 'product detail previews correct image')
  await click('.ant-image-preview-close')
  for (const width of [320,390,430]) { await call('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:1, mobile:true }); await check('document.documentElement.scrollWidth<=innerWidth', width+' layout fits') }
  await click('.discover-back'); await click('.ant-drawer-close'); await click('[aria-label="好玩"]'); await click('.outing-image-link .discover-photo-trigger')
  await check("!!document.querySelector('.ant-image-preview-img')", 'outing photo previews')
  await check("document.querySelectorAll('button button').length===0", 'no nested buttons')
  assert.deepEqual(errors, [])
} finally { ws.close() }

