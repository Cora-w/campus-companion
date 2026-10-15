// Run with a dedicated Chrome debugging endpoint; each run uses an isolated context.
import { writeFile } from 'node:fs/promises'
const endpoint = process.env.TEACHER_QA_CDP || 'http://127.0.0.1:9345'
const appUrl = process.env.TEACHER_QA_URL || 'http://127.0.0.1:5183'
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
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } console.log(await ev("JSON.stringify({text:document.body.innerText.slice(-400),at:[...document.elementsFromPoint(195,600)].slice(0,4).map(e=>e.className),scrolls:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50).slice(0,10).map(e=>({cls:e.className,top:e.scrollTop,h:e.clientHeight,sh:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))})")); await shot('pinch-test-failure'); throw Error(label) }
  const click = async label => { await ev(`(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(e=>e.getClientRects().length);const b=[...(modal||document).querySelectorAll('button')].find(e=>e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.split(' ').join('').trim()===${JSON.stringify(label.split(' ').join('').trim())}));if(!b||b.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});b.click()})()`); await wait() }
  const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
  const login = async role => {
    await check("!!document.querySelector('#login-account')", 'login ready')
    await click('演示账号 查看');await click(role==='teacher'?'填入心理教师演示账号':role==='admin'?'填入管理员演示账号':'填入学生演示账号')
    await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()"); await click('登录')
    await check("!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(`qa/screenshots/${name}.png`, Buffer.from(result.data, 'base64')) }
  await call('Runtime.enable'); await call('Page.bringToFront'); await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2})
  await call('Page.navigate',{url:appUrl}); await wait(1200);
  await check("!!document.querySelector('#login-account')",'login ready')
  await click('注册账号')
  await check("!!document.querySelector('#register-nickname')",'registration form opens')
  await ev("document.querySelector('#login-school').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");await wait();await ev("[...document.querySelectorAll('.ant-select-item-option')].find(e=>e.title==='四川航天职业技术学院').click()");await wait()
  await fill('#register-phone','13800000000');await click('获取验证码');await check("document.querySelector('.registration-demo-code')?.innerText.includes('演示验证码')&&document.querySelector('.registration-code-status').innerText.includes('未发送真实短信')",'demo code shown honestly');await click('填入演示验证码')
  const account='qa_'+Date.now(),password='CampusTest2026'
  await fill('#register-nickname','新注册同学');await fill('#login-account',account);await fill('#login-password',password);await fill('#register-confirm-password','WrongTest2026');await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()")
  await click('注册并登录');await check("document.querySelector('.account-error').innerText.includes('两次输入')",'mismatched passwords blocked')
  await fill('#register-confirm-password',password)
  const actual=await ev("document.querySelector('#register-sms-code').value");await fill('#register-sms-code',String((Number(actual)+1)%1000000).padStart(6,'0'));await click('注册并登录');await check("[...document.querySelectorAll('[role=alert]')].some(e=>e.innerText.includes('验证码不正确'))",'wrong verification code blocked');await click('填入演示验证码')
  for(const width of [320,390,430]){await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();await check("document.documentElement.scrollWidth<=innerWidth",width+'px registration fits')}
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await shot('registration-form')
  await click('注册并登录');await check("!!document.querySelector('.wall-feed')",'registration enters campus homepage')
  await click('我的');await check("document.body.innerText.includes('新注册同学')&&!document.querySelector('.profile-staff-section')",'registered nickname shown with student permissions')
  await click('帮助与反馈');await click('提出建议或反馈问题');await fill('[aria-label=反馈内容]','新注册账号反馈流程检查');await click('提交反馈');await check("document.querySelector('.profile-feedback-item')?.innerText.includes('新注册账号反馈流程检查')",'new registered account authorized for campus feedback')
  await ev('window.campusBack()');await wait();await ev('window.campusBack()');await wait();await click('打开设置');await click('退出当前身份');await click('确认退出');await wait()
  await call('Page.reload');await wait(1600);await check("!!document.querySelector('#login-account')",'refresh requires login')
  await fill('#login-account',account);await fill('#login-password','WrongTest2026');await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()");await click('登录');await check("document.querySelector('.account-error').innerText.includes('密码不匹配')",'wrong registered password rejected')
  await fill('#login-password',password);await click('登录');await check("!!document.querySelector('.wall-feed')",'registered credentials survive refresh')
  await click('我的');await click('打开设置');await click('退出当前身份');await click('确认退出');await wait();await click('注册账号');await fill('#register-phone','13900000000');await click('获取验证码');await click('填入演示验证码');await fill('#register-nickname','重复账号');await fill('#login-account',account);await fill('#login-password',password);await fill('#register-confirm-password',password);await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()");await click('注册并登录');await check("document.querySelector('.account-error').innerText.includes('已注册')",'duplicate school/account registration rejected')
  await click('直接登录');await login('admin');await click('我的');await click('账号管理');await fill('[aria-label=搜索账号]','新注册同学');await check("document.body.innerText.includes('新注册同学')",'administrator can manage registered account')
  console.log('PASS registration, validation, role restriction, campus access, persistence, login and duplicate protection')
}finally {page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}

