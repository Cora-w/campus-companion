import assert from 'node:assert/strict'

const target = await (await fetch(`http://127.0.0.1:${process.env.KEYBOARD_CDP_PORT || '9468'}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
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
const wait = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms))
const frame = () => ev('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
const click = async text => {
  const expression = `(()=>{const buttons=[...document.querySelectorAll('button,[role=menuitem]')].filter(e=>e.getClientRects().length);const b=buttons.find(e=>e.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(e=>e.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))})||buttons.find(e=>e.textContent.trim().startsWith(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`
  let found = false
  for (let attempt = 0; attempt < 30 && !found; attempt++) { found = await ev(expression); if (!found) await wait(100) }
  assert.ok(found, 'button: ' + text)
  await wait()
}
const fill = async (selector, value) => {
  for (let attempt = 0; attempt < 50 && !await ev(`!!document.querySelector(${JSON.stringify(selector)})`); attempt++) await wait(100)
  await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing field '+${JSON.stringify(selector)});const prototype=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await wait(60)
}
const resize = async (width, height = 844) => {
  await ev(`keyboard(${height})`)
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true })
  await frame()
}
const close = async () => {
  await ev('document.activeElement.blur();keyboard(844)')
  await resize(390)
  assert.ok(await ev("(()=>{const button=document.querySelector('.ant-drawer[data-viewport-active=true] .ant-drawer-close');if(!button)return false;button.click();return true})()"))
  await wait(450)
}
const rect = selector => ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})()`)
const active = '.ant-drawer[data-viewport-active="true"], .ant-modal-wrap[data-viewport-active="true"]'
const backgrounds = () => ev(`JSON.stringify([...document.querySelectorAll('.ant-drawer[data-viewport-active="false"]>.ant-drawer-content-wrapper')].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}}))`)

async function checkPageKeyboard(selector, name, stableSelectors) {
  await call('Page.bringToFront')
  await ev(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await wait(60)
  const styles = () => ev(`JSON.stringify(${JSON.stringify(stableSelectors)}.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {top:r.top,height:r.height,font:c.fontSize,padding:c.padding}}))`)
  const before = await styles()
  for (const android of [false,true]) {
    for (const height of [780,680,520,420,520,680,844]) {
      if (android) await resize(390,height)
      else { await ev(`keyboard(${height})`); await frame() }
      assert.equal(await styles(), before, name + ' fixed content and breakpoint')
      assert.equal(await ev("document.documentElement.dataset.compactViewport"), 'false')
    }
  }
  await ev('document.activeElement.blur();keyboard(844)')
  await resize(390)
  console.log('PASS ' + name + ': stable page content and compact-layout breakpoint')
}

async function checkKeyboard(selector, name, footer) {
  if (process.env.KEYBOARD_TEST_ONLY && !process.env.KEYBOARD_TEST_ONLY.split(',').includes(name)) return
  await call('Page.bringToFront')
  const draft = '键盘回归 ' + name
  await fill(selector, draft)
  for (const width of [320,390,430]) {
    await resize(width)
    await ev(`document.querySelector(${JSON.stringify(selector)}).focus()`)
    await wait(60)
    const before = await backgrounds()
    const pageHeight = await ev("document.documentElement.style.getPropertyValue('--viewport-height')")
    for (const android of [false, true]) {
      for (const height of [780,680,520,420,520,680,844]) {
        if (android) await resize(width, height)
        else { await ev(`keyboard(${height})`); await frame() }
        const geometry = await ev(`(()=>{const layer=document.querySelector(${JSON.stringify(active)});const sheet=layer.matches('.ant-drawer')?layer.querySelector('.ant-drawer-content-wrapper'):layer.querySelector('.ant-modal');const r=sheet.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})()`)
        assert.ok(geometry.top >= -2 && geometry.bottom <= height + 2, `${name} ${width}/${height} fits ${JSON.stringify(geometry)}`)
        assert.equal(await backgrounds(), before, `${name} covered layers stable`)
        assert.equal(await ev("document.documentElement.style.getPropertyValue('--viewport-height')"), pageHeight, `${name} resting page height`)
        const field = await rect(selector)
        assert.ok(field.top >= geometry.top - 2 && field.bottom <= height + 2, `${name} input visible ${JSON.stringify(field)}`)
        if (footer) assert.ok(Math.abs((await rect(footer)).bottom - height) < 2, `${name} footer follows keyboard`)
        assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'), `${name} no horizontal overflow`)
      }
    }
    assert.equal(await ev(`document.querySelector(${JSON.stringify(selector)}).value`), draft, `${name} draft preserved`)
    await ev('keyboard(480,35)')
    await wait(60)
    const panned = await rect(selector)
    assert.ok(panned.top >= 35 && panned.bottom <= 515, `${name} input visible after viewport pan`)
    assert.ok(await ev(`(async()=>{const editor=document.querySelector(${JSON.stringify(selector)});let parent=editor.parentElement;while(parent&&parent!==document.body){if(/auto|scroll/.test(getComputedStyle(parent).overflowY)&&parent.scrollHeight-parent.clientHeight>120)break;parent=parent.parentElement;}if(!parent||parent===document.body)return true;parent.scrollTop=0;await new Promise(r=>requestAnimationFrame(r));const before=parent.scrollTop;document.body.classList.add('keyboard-qa-background-update');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));document.body.classList.remove('keyboard-qa-background-update');return parent.scrollTop===before;})()`), `${name} background updates do not hijack manual scrolling`)
  }
  await ev('document.activeElement.blur();keyboard(844)')
  await resize(390)
  console.log('PASS ' + name + ' at 320/390/430px: keyboard animation, Android resize, input visibility, covered layers and draft')
}

try {
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.testViewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{value:window.testViewport});window.keyboard=(height,offset=0)=>{Object.assign(window.testViewport,{height,offsetTop:offset});window.testViewport.dispatchEvent(new Event('resize'));window.testViewport.dispatchEvent(new Event('scroll'))}` })
  await call('Page.navigate', { url: process.env.PROJECT_TEST_URL || 'http://127.0.0.1:5177' })
  await wait(1200)
  await ev('localStorage.clear()')
  await call('Page.reload')
  await wait(1200)
  for (let attempt = 0; attempt < 60 && !await ev("!!document.querySelector('#login-account')"); attempt++) await wait(100)
  await checkPageKeyboard('#login-account', '登录页', ['.account-brand','.companion-logo','.account-brand h1'])
  await fill('#login-account','S-DEMO-01')
  await fill('#login-password','Demo@2026')
  await ev("document.querySelector('input[type=checkbox]').click()")
  await click('登录')
  await wait(600)
  await checkKeyboard('[aria-label=搜索学校]', '学校选择')
  await fill('[aria-label=搜索学校]', '')
  await ev("document.querySelector('input[name=school]').click()")
  await click('确认学校，进入校园')
  for (let attempt = 0; attempt < 60 && !await ev("!!document.querySelector('[aria-label=搜索校园内容]')"); attempt++) await wait(100)

  await ev("document.querySelector('[aria-label=搜索校园内容]').click()")
  await wait()
  await checkKeyboard('[aria-label=校园搜索关键词]', '校园搜索')
  await close()
  await ev("document.querySelector('.wall-post .post-comment-preview, .wall-post .wall-actions button:nth-child(2)').click()")
  await wait()
  await checkKeyboard('.comment-form input', '帖子评论')
  await close()

  await click('消息')
  await checkPageKeyboard('[aria-label=搜索会话]', '消息搜索', ['.mobile-header','.inbox-filters','.inbox-scroll-area'])
  await ev("document.querySelector('.inbox-peer .conversation-row').click()")
  await wait()
  await checkKeyboard('[aria-label=给好友发消息]', '好友聊天', '.conversation-root[data-viewport-active=true] .chat-input')
  await click('聊天更多功能')
  await click('查找聊天记录')
  await checkKeyboard('[aria-label=搜索聊天记录]', '聊天记录搜索')
  await close()
  await close()
  await close()
  await ev("document.querySelector('.inbox-ai').click()")
  await wait()
  await checkKeyboard('[aria-label=向小心发送消息]', 'AI 聊天', '.conversation-root[data-viewport-active=true] .chat-input')
  await close()
  await click('添加好友或创建群聊')
  await click('创建群聊')
  await checkKeyboard('[aria-label=搜索群聊好友]', '群聊好友搜索')
  await fill('[aria-label=搜索群聊好友]', '')
  await ev("document.querySelector('[aria-label=邀请小林]').click()")
  await wait(80)
  await ev("document.querySelector('[aria-label=邀请周同学]').click()")
  await click('下一步')
  await checkKeyboard('[aria-label=群聊名称]', '创建群聊')
  await fill('[aria-label=群聊名称]', '键盘测试群')
  await click('创建群聊')
  await checkKeyboard('[aria-label=群聊消息]', '好友群聊', '.conversation-root[data-viewport-active=true] .chat-input')
  await close()

  await click('首页')
  await click('倾诉空间')
  await checkKeyboard('[aria-label=倾诉内容]', '倾诉空间', '.listening-drawer .listen-composer')
  await close()
  await click('校园闲置')
  await ev("document.querySelector('.product-open').click()")
  await wait()
  await click('立即购买')
  await checkKeyboard('[aria-label=收件地址]', '闲置订单', '.market-checkout-root .checkout-footer')
  await close()
  await close()
  await close()
  await click('活动搭子')
  await ev("document.querySelector('.activity-summary').click()")
  await wait()
  await click('加入活动')
  await click('进入活动群聊')
  await checkKeyboard('[aria-label=服务聊天消息]', '活动群聊', '.hub-chat-root .listen-composer')
  await close()
  await close()
  await close()

  await click('零食铺子')
  await checkKeyboard('[aria-label=搜索零食店铺]', '零食店铺搜索')
  await fill('[aria-label=搜索零食店铺]', '')
  await ev("document.querySelector('.snack-shop-heading').click()")
  await wait()
  await ev("document.querySelector('.snack-quantity button:last-child').click()")
  await click('去结算')
  await checkKeyboard('[aria-label=联系电话]', '零食结算')
  await close()
  await close()
  await close()

  await click('我的')
  await click('编辑资料')
  await checkKeyboard('[aria-label=真实姓名]', '编辑资料', '.ant-drawer[data-viewport-active=true] .ant-drawer-footer')
  await close()
  await click('放弃修改')
  await click('首页')
  await click('发布')
  await fill('#post-title','键盘测试标题')
  await ev("document.querySelector('#post-text').focus()")
  const writingHeight = await ev("getComputedStyle(document.querySelector('#post-text')).height")
  for (const height of [780,680,520,420,520,680,844]) {
    await resize(390,height)
    assert.ok((await rect('.compose-publish-bar')).bottom <= height + 2, 'publish actions above keyboard')
    assert.equal(await ev("getComputedStyle(document.querySelector('#post-text')).height"), writingHeight, 'publish textarea does not switch layout at keyboard breakpoints')
  }
  await click('所在位置')
  await checkKeyboard('[aria-label=搜索地点]', '发布地点搜索')
  await close()
  await click('发现')
  await ev("document.querySelector('.discover-shop-info').click()")
  await wait()
  await click('写评价')
  await checkKeyboard('[aria-label=探店评价]', '探店评价')
  assert.deepEqual(errors, [])
  console.log('PASS project keyboard regression')
} finally {
  ws.close()
}
