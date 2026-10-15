import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://[::1]:9351/json/new?about:blank',{method:'PUT'})).json()
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
  const expression = `(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(m=>m.getClientRects().length&&!m.classList.contains('ant-zoom-leave'));const buttons=[...(modal||document).querySelectorAll('button')].filter(b=>b.getClientRects().length);const b=buttons.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)})||buttons.find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g, ''))});if(!b||b.disabled)throw Error('Missing or disabled: '+${JSON.stringify(text)});b.click()})()`
  await ev(expression); await wait()
}
const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
const role = async value => { await click('切换身份⌄'); await ev(`(()=>{const names={student:'学生',teacher:'心理教师',admin:'管理员'};const item=[...document.querySelectorAll('.ant-dropdown-menu-item')].find(item=>item.innerText===names[${JSON.stringify(value)}]);if(!item)throw Error('Missing role');item.click()})()`); await wait() }
const shot = async name => { await call('Page.bringToFront'); await wait(); await writeFile(`qa/screenshots/${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64')) }
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const close = async () => { await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500) }
const select = async (label, choice) => {
  await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await wait()
  await ev(`(()=>{const option=[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)});if(!option)throw Error('Missing option');option.click()})()`); await wait()
}
const appointmentAction = async (student, action) => { await ev(`(()=>{const card=[...document.querySelectorAll('.tw-appointment')].find(c=>c.innerText.includes(${JSON.stringify(student)}));const b=[...card.querySelectorAll('button')].find(b=>b.innerText.split(' ').join('').trim()===${JSON.stringify(action)});if(!b)throw Error('Missing appointment action');b.click()})()`); await wait() }
const login = async (kind,account) => { await role(kind); await select('登录学校','四川航天职业技术学院'); await fill('#login-account',account); await fill('#login-password','Demo@2026'); await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1000) }
const studentExit = async () => { await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(500) }
const closeTop = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].filter(b=>b.getClientRects().length).at(-1).click()"); await wait(500) }

const tab=async label=>{await ev("[...document.querySelectorAll('.bottom-nav button')].find(b=>b.getAttribute('aria-label')==="+JSON.stringify(label)+").click()");await wait()}
const fits=async label=>{await check('document.documentElement.scrollWidth<=innerWidth',label+' page fits');await check("(()=>{const d=[...document.querySelectorAll('.ant-drawer-open')].at(-1);if(!d)return true;const w=d.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect(),b=d.querySelector('.ant-drawer-body');return w.width<=Math.min(innerWidth,480)+1&&b.scrollWidth<=b.clientWidth+1})()",label+' overlay fits')}
const staffClose=async()=>{await ev('window.campusBack()');await wait(600)}
try {
await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5191'});await wait(2000);await ev("localStorage.clear();for(const id of ['A-DEMO-01','S-DEMO-01','T-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')");await call('Page.reload');await wait(1000)
for(const [kind,account] of [['student','S-DEMO-01'],['teacher','T-DEMO-01'],['admin','A-DEMO-01']]){
 await login(kind,account)
 await check("!!document.querySelector('.wall-feed')&&document.querySelector('.mobile-brand').innerText.includes('心伙伴')",kind+' lands on shared campus home')
 await check("JSON.stringify([...document.querySelectorAll('.bottom-nav button')].map(b=>b.getAttribute('aria-label')))===JSON.stringify(['首页','发现','发布','消息','我的'])",kind+' identical main navigation')
 await check("new Set([...document.querySelectorAll('.bottom-nav button')].map(b=>b.getBoundingClientRect().top)).size===1",kind+' navigation stays in one row')
 await shot('unified-'+kind+'-home')
 for(const width of [320,390,430,966]){await resize(width);for(const name of ['首页','发现','发布','消息','我的']){await tab(name);await fits(kind+' '+name+' '+width)}}
 await resize(390);await tab('我的')
 await check("document.querySelector('.personal-identity').innerText.includes('四川航天职业技术学院')",kind+' actual bound school shown')
 await check("document.querySelectorAll('.profile-staff-menu button').length==="+(kind==='student'?0:kind==='teacher'?5:6),kind+' role-specific My entries')
 await check(kind==='teacher'?"!document.querySelector('.profile-staff-menu').innerText.includes('账号管理')":kind==='admin'?"!document.querySelector('.profile-staff-menu').innerText.includes('学生支持档案')":"!document.querySelector('.profile-staff-menu')",kind+' privilege boundary')
 await shot('unified-'+kind+'-my')
 await tab('发布');await fill('#post-title',kind+'的校园分享');await fill('#post-text','统一校园入口测试：每种身份都可以分享校园生活。');await click('发布到校园墙');await check("document.querySelector('.wall-feed').innerText.includes("+JSON.stringify(kind+'的校园分享')+")",kind+' can publish')
 await click('评论下课以后，去操场走两圈');await fill('[aria-label=评论内容]',kind+'的友善评论');await click('发送');await check("document.querySelector('.post-detail-comments').innerText.includes("+JSON.stringify(kind+'的友善评论')+")",kind+' can comment');await click('举报');await click('提交举报');await check("document.body.innerText.includes('已举报，等待审核')",kind+' can submit own report');await closeTop()
 await tab('首页');await click('零食铺子');await click('进入下课零食社');await click('添加海盐脆薯片');await click('去结算');await click('到店自提');await ev("[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.startsWith('提交演示订单')).click()");await wait();await check("!!document.querySelector('.snack-order-success')&&document.querySelector('.snack-order-success').innerText.includes('已生成演示订单')",kind+' order accepted');await closeTop();await closeTop();await check("!document.querySelector('.snack-root.ant-drawer-open')",kind+' returns from snack store to campus')
 await tab('我的');await click('帮助与反馈');await click('提出建议或反馈问题');await fill('[aria-label=反馈内容]',kind+'校园服务建议：验证同一套校园功能。');await click('提交反馈');await check("document.body.innerText.includes('反馈已提交')",kind+' can submit own feedback');await closeTop();await closeTop()
 if(kind!=='student'){
  await tab('发布');await fill('#post-title',kind+'待完成草稿');await fill('#post-text','草稿要在进入工作功能后继续保留。');await tab('我的')
  const labels=await ev("[...document.querySelectorAll('.profile-staff-menu button')].map(b=>b.getAttribute('aria-label'))")
  for(const label of labels){await click(label);await check("!!document.querySelector('.campus-workspace-overlay.ant-drawer-open')",kind+' '+label+' opens from My');await check("!document.querySelector('.tw-app-nav')&&!document.querySelector('.admin-sidebar')",kind+' no second primary navigation');for(const width of [320,390,430,966]){await resize(width);await fits(kind+' '+label+' '+width)};await resize(390);await check("getComputedStyle(document.querySelector('.campus-workspace .ant-drawer-body')).backgroundColor===getComputedStyle(document.querySelector('.app-shell')).backgroundColor",kind+' '+label+' matches campus palette');if(label==='心理支持工作台'||label==='账号管理')await shot('unified-'+kind+'-workspace');await staffClose()}
  await tab('发布');await check("document.querySelector('#post-title').value==="+JSON.stringify(kind+'待完成草稿'),kind+' workspace preserves campus draft');await tab('我的');await click('打开设置');await click('晴空蓝');await closeTop();await click(kind==='teacher'?'心理支持工作台':'账号管理');await check("getComputedStyle(document.querySelector('.campus-workspace .ant-drawer-body')).backgroundColor===getComputedStyle(document.querySelector('.app-shell')).backgroundColor",kind+' professional canvas follows changed theme');await check("getComputedStyle(document.querySelector('.campus-workspace .teacher-shell-host,.campus-workspace .admin-shell-host')).getPropertyValue('--accent').trim()===getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()",kind+' professional accent follows changed theme');await staffClose();await click('打开设置');await click('暖陶橙');await closeTop()
 }
 if(kind==='teacher'){
  await click('心理支持工作台');await click('全部预警');await check("!!document.querySelector('.tw-triage-page')",'teacher workspace internal routing');await staffClose();await check("document.querySelector('.tw-page-heading h1').innerText==='工作台'",'workspace back restores previous professional page');await staffClose();await click('学生支持档案');await ev("document.querySelector('[aria-label=\"查看同学 A支持档案\"]').click()");await wait();await fill('#review-note','统一入口回归：已核实并需要继续支持。');await click('确认需要跟进，接手处理');await check("document.body.innerText.includes('复核已完成')",'teacher review remains functional');await closeTop();await staffClose()
 }
 if(kind==='admin'){
  await click('帖子举报与违规审核');await check("document.querySelector('.moderation-stats').innerText.includes('1')&&document.querySelector('.moderation-list').innerText.includes('优先审核')",'three identities reports aggregate in admin review');await click('审核帖子：下课以后，去操场走两圈');await fill('#moderation-reason','统一入口回归：核实违规后删除公开帖。');await click('删除违规帖');await click('确认删除');await check("document.body.innerText.includes('违规帖子已删除')",'admin moderation remains functional');await staffClose();await tab('首页');await check("!document.querySelector('.wall-feed').innerText.includes('下课以后，去操场走两圈')",'moderated post removed from shared admin feed');await tab('我的');await click('校园通知');await click('新建通知');await fill('#campus-notice-title','统一校园入口通知');await fill('#campus-notice-body','所有校园身份均可查看这条通知。');await click('发布通知');await click('确认发布');await wait(500);await staffClose();await click('服务消息');await check("document.querySelector('.campus-student-notices').innerText.includes('统一校园入口通知')",'admin also reads campus notices');await closeTop();await click('反馈处理');await check("document.querySelector('.campus-service-panel').innerText.includes('teacher校园服务建议')",'admin can manage staff feedback');await staffClose()
 }
 await studentExit()
}
await login('teacher','T-DEMO-01');await check("!document.querySelector('.wall-feed').innerText.includes('下课以后，去操场走两圈')",'moderation shared across identities after re-login');await click('服务消息');await check("document.querySelector('.campus-student-notices').innerText.includes('统一校园入口通知')",'teacher reads published campus notice');await closeTop();await tab('我的');await click('学生支持档案');await ev("document.querySelector('[aria-label=\"查看同学 A支持档案\"]').click()");await wait();await check("document.body.innerText.includes('统一入口回归：已核实')",'teacher service data survives leaving workspace and re-login');await closeTop();await staffClose()
if(errors.length)throw Error(errors.join('\n'));console.log('Unified campus checks passed')
}finally{ws.close()}
