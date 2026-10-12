// Run with a dedicated Chrome debugging endpoint; each run uses an isolated context.
import { writeFile } from 'node:fs/promises'
const endpoint = process.env.TEACHER_QA_CDP || 'http://127.0.0.1:9345'
const appUrl = process.env.TEACHER_QA_URL || 'http://127.0.0.1:5182'
const connect = async url => {
  const ws = new WebSocket(url)
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const promise = pending.get(message.id); pending.delete(message.id); if (message.error) promise.reject(message.error); else promise.resolve(message.result) } })
  return { ws, call: (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) }) }
}
const browser = await connect((await (await fetch(`${endpoint}/json/version`)).json()).webSocketDebuggerUrl)
const { browserContextId } = await browser.call('Target.createBrowserContext')
let page
try {
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId })
  page = await connect((await (await fetch(`${endpoint}/json`)).json()).find(target => target.id === targetId).webSocketDebuggerUrl)
  const call = page.call
  const ev = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const wait = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms))
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } throw Error(label) }
  const click = async label => { await ev(`(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(e=>e.getClientRects().length);const b=[...(modal||document).querySelectorAll('button')].find(e=>e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.split(' ').join('').trim()===${JSON.stringify(label.split(' ').join('').trim())}));if(!b||b.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});b.click()})()`); await wait() }
  const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
  const login = async role => {
    await check("!!document.querySelector('#login-account')", 'login ready')
    await click('切换身份⌄')
    await ev(`[...document.querySelectorAll('.ant-dropdown-menu-item')].find(e=>e.innerText===${JSON.stringify(role === 'teacher' ? '心理教师' : '学生')}).click()`); await wait()
    await fill('#login-account', role === 'teacher' ? 'T-DEMO-01' : 'S-DEMO-01'); await fill('#login-password', 'Demo@2026')
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check(role === 'teacher' ? "!!document.querySelector('.tw-shell')" : "!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  await call('Page.navigate', { url: appUrl }); await wait(1300)
  await ev("localStorage.setItem('campus-school-v1:T-DEMO-01','sichuan-aerospace-polytechnic')")
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await login('teacher')
  const pages = [['工作台','workbench'],['预警','triage'],['学生','care'],['日程','schedule'],['我的','profile']]
  for(const [label,name] of pages) {
    await click(label)
    for(const width of [320,390,430,1200]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500}); await wait()
      await check('document.documentElement.scrollWidth<=innerWidth',name+' fits '+width+'px')
      await check("document.querySelector('.tw-shell').getBoundingClientRect().width<=480",name+' keeps phone width')
    }
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await wait()
    await check("document.querySelector('.tw-app-nav').getBoundingClientRect().bottom===innerHeight&&getComputedStyle(document.querySelector('.tw-app-nav')).borderRadius==='0px'",name+' navigation stays at screen bottom')
    await shot('teacher-visual-'+name)
  }
  await click('工作台'); await check("document.querySelector('.tw-focus-panel').contains(document.querySelector('.tw-priority-banner'))&&document.querySelector('.tw-focus-panel').contains(document.querySelector('.tw-followup-entry'))",'one focus area groups review and due follow-up')
  await click('学生'); await ev("[...document.querySelectorAll('.tw-student-card')].find(x=>x.innerText.includes('同学 B')).click()"); await wait()
  await check("document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper').getBoundingClientRect().top===0",'detail is a full page')
  await shot('teacher-visual-detail')
  const headerTop=await ev("document.querySelector('.ant-drawer-open .ant-drawer-header').getBoundingClientRect().top")
  await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop=500"); await wait()
  await check(`document.querySelector('.ant-drawer-open .ant-drawer-header').getBoundingClientRect().top===${headerTop}`,'detail header remains fixed while reading')
  await click('服务记录'); await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop=0"); await wait(); await shot('teacher-visual-records')
  await click('约谈该学生'); await wait(700)
  for(const width of [320,390,430,1200]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500}); await wait()
    await check("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollWidth<=document.querySelector('.ant-drawer-open .ant-drawer-body').clientWidth",'booking fits '+width+'px')
    await check("document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper').getBoundingClientRect().width<=480",'booking uses phone width')
  }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await wait(); await shot('teacher-visual-booking')
  await ev("document.querySelector('.ant-drawer-open .ant-drawer-body').scrollTop=500"); await wait()
  await check("document.querySelector('.ant-drawer-open .ant-drawer-footer').getBoundingClientRect().bottom<=innerHeight",'booking action stays in viewport')
  await close(); await check("!document.querySelector('.ant-drawer-open')",'back arrow returns to originating page')
  await call('Page.reload'); await wait(900); await check("!!document.querySelector('#login-account')",'entry remains login')
  console.log('Teacher visual and responsive checks passed')
} finally {
  page?.ws.close()
  await browser.call('Target.disposeBrowserContext',{browserContextId})
  browser.ws.close()
}