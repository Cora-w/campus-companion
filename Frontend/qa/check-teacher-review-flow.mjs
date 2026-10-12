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
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await call('Page.navigate', { url: appUrl }); await wait(1500)
  await ev("localStorage.setItem('campus-school-v1:T-DEMO-01','sichuan-aerospace-polytechnic');localStorage.setItem('campus-school-v1:S-DEMO-01','sichuan-aerospace-polytechnic')")
  await ev("localStorage.setItem('campus-demo-appointments-v1',JSON.stringify({version:1,appointments:[]}))"); await call('Page.reload'); await wait(800)
  await login('teacher')
  const today = await ev("new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())")
  const tomorrow = await ev("new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(Date.now()+86400000))")
  await check("document.querySelector('.tw-panel-title h2').innerText==='高风险与待复核'&&document.querySelector('.tw-alert-list b').innerText==='同学 A'", 'high risk and review queue first')
  await shot('teacher-review-workbench')
  await click('学生')
  await check("document.querySelectorAll('.tw-roster-summary').length===4&&document.querySelectorAll('.tw-roster-latest').length===4&&getComputedStyle(document.querySelector('.tw-roster-summary')).display==='block'", 'detailed student list with aligned summaries and recent records')
  for (const width of [320,390,430,1209]) { await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false}); await wait(); await check('document.documentElement.scrollWidth<=innerWidth', width+'px list fits') }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await shot('teacher-review-students')
  await ev("document.querySelector('[aria-label=\"查看同学 C支持档案\"]').click()"); await wait()
  await check("[...document.querySelectorAll('button')].find(e=>e.innerText==='约谈该学生').disabled", 'unreviewed student cannot be invited')
  await fill('#review-note', '已了解适应情况，继续观察并安排复核。'); await check("[...document.querySelectorAll('button')].find(e=>e.innerText==='继续观察，安排复核').disabled", 'observation requires a date')
  await fill('#observation-date', today); await click('继续观察，安排复核'); await close(); await click('工作台')
  await check("document.querySelector('.tw-mobile-workbench').innerText.includes('同学 C · 观察复核')", 'observation due reminder')
  await click('学生'); await ev("document.querySelector('[aria-label=\"查看同学 A支持档案\"]').click()"); await wait()
  await fill('#review-note','已完成复核，确认需要支持。'); await click('确认需要跟进，接手处理'); await click('约谈该学生')
  await check("document.querySelector('.tw-booking-drawer').innerText.includes('同学 A')", 'reviewed student preselected')
  await click('下一步'); await fill('#booking-day',tomorrow); await fill('#booking-start','15:00'); await click('下一步'); await fill('#booking-location','心理中心 · 咨询室 01'); await click('发送约谈邀请')
  await fill('[aria-label="日程日期"]',tomorrow)
  await check("document.querySelector('.tw-schedule-list').innerText.includes('待确认')", 'teacher sees pending invitation')
  await check("[...document.querySelectorAll('.tw-appointment')].find(e=>e.innerText.includes('同学 A')).querySelectorAll('button')[1].disabled", 'pending invitation cannot be completed')
  await teacherLogout(); await login('student'); await click('我的'); await click('我的约谈')
  await check("document.querySelector('.student-invitations').innerText.includes('15:00')&&!document.querySelector('.student-invitations').innerText.includes('风险')", 'student receives invitation without risk labels')
  await check("document.querySelector('.student-invitations').innerText.includes('待确认')", 'profile invitation entry shows pending response')
  await click('暂不参加'); await click('告知老师暂不参加'); await check("document.querySelector('.student-invitations').innerText.includes('请填写暂不参加')", 'decline reason required')
  await fill('[aria-label="暂不参加原因"]','这次暂不方便参加，希望老师另行联系。'); await click('告知老师暂不参加')
  await check("document.querySelector('.student-invitations').innerText.includes('已婉拒')", 'student declines invitation')
  await studentLogout(); await login('teacher'); await click('日程'); await fill('[aria-label="日程日期"]',tomorrow)
  await check("document.querySelector('.tw-schedule-list').innerText.includes('这次暂不方便参加')", 'teacher sees decline and reason')
  await ev("[...document.querySelectorAll('.tw-appointment')].find(e=>e.innerText.includes('同学 A')).querySelector('button').click()"); await wait(); await click('下一步'); await click('下一步'); await click('确认改期并重新邀请')
  await teacherLogout(); await login('student'); await click('我的'); await click('我的约谈')
  await click('申请改期'); await click('提交改期申请')
  await check("document.querySelector('.student-invitations').innerText.includes('请填写改期原因')", 'reschedule reason required')
  await fill('[aria-label="希望约谈日期"]',tomorrow); await fill('[aria-label="希望约谈时间"]','16:00'); await fill('[aria-label="改期原因"]','原时间有课程，希望改到下课后。'); await click('提交改期申请')
  await check("document.querySelector('.student-invitations').innerText.includes('等待老师确认')", 'student change request saved')
  for(const width of [320,390,430]) { await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true}); await wait(); await check("document.querySelector('.student-invitations').scrollWidth<=document.querySelector('.student-invitations').clientWidth+1",width+'px student invitation fits') }
  await shot('student-interview-change-request')
  await studentLogout(); await login('teacher'); await click('日程'); await fill('[aria-label="日程日期"]',tomorrow)
  await check("document.querySelector('.tw-schedule-list').innerText.includes('原时间有课程')", 'teacher receives reason and preferred time')
  await click('处理改期申请'); await check("document.querySelector('#booking-start').value==='16:00'", 'preferred time prefilled')
  await click('下一步'); await click('下一步'); await click('确认改期并重新邀请'); await check("document.querySelector('.tw-schedule-list').innerText.includes('待确认')&&!document.querySelector('.tw-schedule-list').innerText.includes('申请改期')", 'new invitation resets confirmation')
  await teacherLogout(); await login('student'); await click('我的'); await click('我的约谈'); await click('接受邀请')
  await check("document.querySelector('.student-invitations').innerText.includes('已接受')", 'student accepts revised invitation')
  await studentLogout(); await login('teacher'); await click('日程'); await fill('[aria-label="日程日期"]',tomorrow)
  await check("document.querySelector('.tw-schedule-list').innerText.includes('已接受')", 'acceptance survives role switch')
  await click('完成'); await click('确认'); await check("document.querySelector('.tw-schedule-list').innerText.includes('待补服务记录')", 'accepted meeting can finish and requires record')
  await shot('teacher-interview-confirmed')
  console.log('Teacher review, observation and student invitation flow passed.')
} finally {
  page?.ws.close()
  await browser.call('Target.disposeBrowserContext', { browserContextId })
  browser.ws.close()
}
