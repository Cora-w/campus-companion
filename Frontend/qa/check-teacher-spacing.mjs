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
  const shot = async name => { await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64')) }
  const login = async role => {
    await click('切换身份⌄'); await ev(`[...document.querySelectorAll('.ant-dropdown-menu-item')].find(e=>e.innerText===${JSON.stringify({teacher:'心理教师',admin:'管理员',student:'学生'}[role])}).click()`); await wait()
    await fill('#login-account',{teacher:'T-DEMO-01',admin:'A-DEMO-01',student:'S-DEMO-01'}[role]); await fill('#login-password','Demo@2026'); await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1100)
  }
  const resize=async width=>{await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait()}
  await resize(390);await call('Page.navigate',{url:appUrl});await wait(1000)
  await ev("localStorage.setItem('campus-school-v1:T-DEMO-01','sichuan-aerospace-polytechnic')");await login('teacher')
  for(const width of [320,390,430]){
    await resize(width)
    await check("(()=>{const row=document.querySelector('.staff-agenda-row'),box=row.getBoundingClientRect(),body=row.querySelector('.staff-agenda-body').getBoundingClientRect(),time=row.querySelector('.staff-agenda-time').getBoundingClientRect();return parseFloat(getComputedStyle(row).paddingLeft)>=16&&time.left-box.left>=16&&body.left>time.right&&row.scrollWidth<=row.clientWidth})()",width+'px agenda content has real inner spacing')
  }
  await resize(390);await ev("document.querySelector('.tw-today-panel').scrollIntoView({block:'start'})");await wait();await shot('teacher-agenda-spacing-fixed')
  await ev("document.querySelector('.staff-agenda-row').click()");await wait()
  await check("document.querySelector('.tw-page-schedule')!==null",'agenda row still opens schedule')
  for(const width of [320,390,430]){
    await resize(width)
    await check("(()=>{const button=[...document.querySelectorAll('.tw-panel-title .ant-btn')].find(e=>e.innerText==='新增预约'),s=getComputedStyle(button);return parseFloat(s.paddingLeft)>=14&&parseFloat(s.paddingRight)>=14&&button.getBoundingClientRect().height>=44&&button.scrollWidth<=button.clientWidth&&document.documentElement.scrollWidth<=innerWidth})()",width+'px new appointment button has padding and fits')
  }
  await resize(390);await shot('teacher-schedule-button-fixed')
  await click('新增预约');await check("!!document.querySelector('.tw-booking-drawer')",'new appointment button remains functional')
  console.log('Teacher spacing checks passed')
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}