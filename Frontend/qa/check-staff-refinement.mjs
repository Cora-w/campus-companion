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
  const resize=async width=>{await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});await wait()}
  const close=async()=>{await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()");await wait(500)}
  const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)}).click()`);await wait()}
  const disabled=label=>`[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(label)}).disabled`
  await resize(390);await call('Page.navigate',{url:appUrl});await wait(1200)
  await ev("localStorage.setItem('campus-appearance-theme','warm');for(const id of ['T-DEMO-01','A-DEMO-01','S-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')")
  await call('Page.reload');await wait(900)
  await check("document.querySelector('.account-login').dataset.palette==='clay'&&getComputedStyle(document.querySelector('.account-submit')).backgroundColor==='rgb(184, 64, 32)'",'original login preserved')
  await login('teacher')
  await check("document.querySelector('.tw-app-header').querySelectorAll('button').length===1&&!document.querySelector('.tw-app-header [aria-label=\"约谈学生\"]')",'teacher header is simplified and actions moved into content')
  await click('使用帮助');await check("document.body.innerText.includes('授权与隐私')",'teacher help retains detailed explanations');await close()
  for(const [label,name] of [['工作台','workbench'],['预警','triage'],['学生','care'],['日程','schedule'],['我的','profile']]){
    await click(label)
    for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',name+' fits '+width+'px')}
    await resize(390);await shot('staff-teacher-'+name)
  }
  await click('学生');await check("document.querySelectorAll('.tw-roster-latest').length===4&&getComputedStyle(document.querySelector('.tw-roster-summary')).display==='block'",'detailed student summaries and latest records are not clipped')
  await click('预警');await ev("document.querySelector('.tw-alert-case').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");await wait()
  await check("!!document.querySelector('.teacher-detail')",'warning row opens details by keyboard')
  await check(disabled('确认需要跟进，接手处理'),'review requires a note before submission')
  await fill('#review-note','复核测试：已了解实际支持需要。');await check(disabled('继续观察，安排复核'),'observation requires its date before submission');await click('确认需要跟进，接手处理')
  await click('约谈该学生');await check("document.querySelector('.staff-form-steps [aria-current=step]').textContent.includes('约谈对象')",'booking starts with student step');await click('下一步')
  await close();await check("!!document.querySelector('.tw-booking-drawer')&&document.querySelector('.staff-form-steps [aria-current=step]').textContent.includes('约谈对象')",'booking back arrow returns one step')
  await click('下一步');await fill('#booking-day','2020-01-01');await check(disabled('下一步'),'past booking date blocks next step')
  const tomorrow=await ev("new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(Date.now()+86400000))")
  await fill('#booking-day',tomorrow);await fill('#booking-start','15:00');await click('下一步');await check(disabled('发送约谈邀请'),'booking needs contact location before sending')
  await fill('#booking-location','测试咨询室');await shot('staff-teacher-booking');await click('发送约谈邀请')
  await fill('[aria-label="日程日期"]',tomorrow);await check("document.querySelector('.tw-schedule-list').innerText.includes('测试咨询室')",'booking is saved into schedule')
  await click('学生');await ev("document.querySelector('[aria-label=\"查看同学 A支持档案\"]').click()");await wait();await click('服务记录')
  await check(disabled('下一步：跟进安排'),'record needs actual communication summary')
  await select('记录模板','初次沟通');await click('填入模板');await check(disabled('下一步：跟进安排'),'template placeholders cannot advance')
  await fill('#care-summary','沟通测试：已提供学习适应支持。');await fill('#care-response','学生愿意继续沟通。');await click('下一步：跟进安排')
  await check(disabled('保存记录与跟进安排'),'unfinished follow-up blocks record save');await fill('#care-plan','继续回访学习适应情况。');await fill('#care-date','2020-01-01');await check(disabled('保存记录与跟进安排'),'past follow-up date blocks save')
  await fill('#care-date',tomorrow);await shot('staff-teacher-record');await close();await check(`document.querySelector('#care-summary').value.includes('沟通测试')&&document.querySelector('#care-date').value===${JSON.stringify(tomorrow)}`,'record back preserves both steps')
  await click('下一步：跟进安排');await click('保存记录与跟进安排');await check("document.querySelector('.teacher-detail').innerText.includes('沟通测试')",'step record saved into student history')
  await fill('#care-summary','未保存草稿');await close();await click('继续填写');await check("document.querySelector('#care-summary').value==='未保存草稿'",'discard cancellation preserves draft');await close();await click('放弃修改')
  await click('我的');await click('退出教师账号');await login('admin')
  for(const [label,name] of [['账号管理','accounts'],['开店授权','shops'],['校园通知','notices'],['反馈处理','feedback'],['我的','profile']]){
    await click(label);for(const width of [320,390,430]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth','admin '+name+' fits '+width+'px')}await resize(390);await shot('staff-admin-'+name)
  }
  await click('使用帮助');await check("document.body.innerText.includes('记录与权限')",'admin help remains accessible');await close()
  await click('账号管理');await check("!document.querySelector('.admin-account-list .ant-switch')&&!document.querySelector('.admin-account-list button')",'account list has no inline operation buttons')
  await ev("document.querySelector('[data-account-id=\"T-DEMO-01\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");await wait();await check("!!document.querySelector('.staff-account-detail')",'account row opens details by keyboard')
  await click('编辑陈老师');await fill('#admin-account-name','');await check(disabled('保存账号'),'empty account name disables save');await fill('#admin-account-name','陈老师（测试）');await click('保存账号');await check("document.querySelector('.staff-account-detail').innerText.includes('陈老师（测试）')",'account save returns to updated details')
  await click('停用账号');await click('取消');await check("document.querySelector('.staff-account-detail').innerText.includes('已启用')",'canceling account suspension preserves state');await close()
  await click('开店授权');await ev("document.querySelector('[data-shop-account=\"S-DEMO-01\"]').click()");await wait();await check("!!document.querySelector('.ant-drawer-open [aria-label=\"开店权限 S-DEMO-01\"]')&&!document.querySelector('.admin-shop-students .ant-switch')",'shop permission moves into details');await close()
  await click('校园通知');await check("document.querySelector('.campus-service-panel .ant-btn-primary').getBoundingClientRect().height>=44&&getComputedStyle(document.querySelector('.campus-service-panel .ant-btn-primary')).color==='rgb(255, 255, 255)'",'notice button is readable and touch sized');await click('新建通知');await check(disabled('发布通知'),'notice cannot publish with missing fields');await fill('#campus-notice-title','测试通知');await fill('#campus-notice-body','测试通知正文。');await click('发布通知');await check("document.body.innerText.includes('确认发布通知？')",'publishing notice requires confirmation');await click('继续编辑');await close();await click('继续编辑');await check("document.querySelector('#campus-notice-title').value==='测试通知'",'notice discard cancellation preserves content');await click('保存草稿')
  await click('我的');await click('退出管理员账号');await click('退出登录');await check("document.querySelector('.account-login').dataset.palette==='clay'",'logout returns to unchanged login')
  console.log('Staff refinement checks passed')
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}