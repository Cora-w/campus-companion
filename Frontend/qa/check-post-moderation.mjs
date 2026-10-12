import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://127.0.0.1:9350/json/new?about:blank',{method:'PUT'})).json()
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
const shot = async name => { await wait(); await writeFile(`qa/screenshots/${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64')) }
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const close = async () => { await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()"); await wait(500) }
const select = async (label, choice) => {
  await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await wait()
  await ev(`(()=>{const option=[...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].find(o=>o.getAttribute('title')===${JSON.stringify(choice)});if(!option)throw Error('Missing option');option.click()})()`); await wait()
}
const appointmentAction = async (student, action) => { await ev(`(()=>{const card=[...document.querySelectorAll('.tw-appointment')].find(c=>c.innerText.includes(${JSON.stringify(student)}));const b=[...card.querySelectorAll('button')].find(b=>b.innerText.split(' ').join('').trim()===${JSON.stringify(action)});if(!b)throw Error('Missing appointment action');b.click()})()`); await wait() }
const login = async (kind,account) => { await role(kind); await fill('#login-account',account); await fill('#login-password','Demo@2026'); await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1000) }
const studentExit = async () => { await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(500) }
const closeTop = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].filter(b=>b.getClientRects().length).at(-1).click()"); await wait(500) }
try {
await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5190'});await wait(2000)
await ev("localStorage.setItem('campus-school-v1:A-DEMO-01','sichuan-aerospace-polytechnic');localStorage.setItem('campus-school-v1:S-DEMO-01','sichuan-aerospace-polytechnic')")
await login('student','S-DEMO-01');await click('发布');await fill('#post-title','审核联动测试公开帖');await fill('#post-text','用于验证共享校园墙及作者删除功能的公开测试正文。');await click('发布到校园墙');await check("document.querySelector('.wall-feed').innerText.includes('审核联动测试公开帖')",'student publish still works'); await click('评论下课以后，去操场走两圈');await fill('[aria-label=评论内容]','审核联动测试评论');await click('发送');await check("document.querySelector('.post-detail-comments').innerText.includes('审核联动测试评论')",'student comment still works');await click('举报');await click('提交举报');await check("[...document.querySelectorAll('button')].some(b=>b.disabled&&b.innerText==='已举报，等待审核')",'student report submitted once')
await closeTop();await studentExit();await login('admin','A-DEMO-01');await click('反馈处理');await check("document.body.innerText.includes('1 条待审')",'report badge reaches admin');await click('帖子审核');await check("document.querySelectorAll('.moderation-list>button').length===1",'same session report appears in admin queue')
await click('审核帖子：下课以后，去操场走两圈');await check("document.querySelector('.moderation-reports').innerText.includes('1 次')&&!document.querySelector('.moderation-reports').innerText.includes('S-DEMO-01')",'reporter identity hidden');await check("[...document.querySelectorAll('button')].find(b=>b.innerText==='删除违规帖').disabled",'review requires explanation')
await fill('#moderation-reason','测试审核：内容可保留。');await click('审核保留');await click('确认保留');await check("document.body.innerText.includes('现有举报已处理')&&document.querySelectorAll('.moderation-list>button').length===0",'retain closes queue')
await select('筛选帖子审核状态','全部公开帖');await click('审核帖子：下课以后，去操场走两圈');await fill('#moderation-reason','测试审核：确认违规，删除公开内容。');await click('删除违规帖');await click('返回审核');await check("!!document.querySelector('#moderation-reason')",'cancel delete keeps post');await click('删除违规帖');await click('确认删除');await check("document.body.innerText.includes('违规帖子已删除')",'delete updates queue')
await select('筛选帖子审核状态','已删除');await check("document.querySelectorAll('.moderation-list>button').length===1",'deleted retained as moderation evidence');await click('审核帖子：下课以后，去操场走两圈');await check("document.body.innerText.includes('测试审核：确认违规')&&!document.querySelector('#moderation-reason')",'deleted detail read only with reason');await shot('admin-post-deleted');await closeTop();await closeTop()
await click('我的');await click('操作记录');await check("document.body.innerText.includes('删除违规帖子 post-2')",'delete audited without post body');await closeTop();await click('退出管理员账号');await click('退出登录');await login('student','S-DEMO-01')
await check("![...document.querySelectorAll('.wall-post')].some(e=>e.innerText.includes('下课以后，去操场走两圈'))",'deleted absent from wall after student re-login');await ev("document.querySelector('[aria-label=搜索校园内容]').click()");await wait();await fill('[aria-label=校园搜索关键词]','下课以后，去操场走两圈');await check("![...document.querySelectorAll('.campus-unified-search button')].some(b=>b.innerText.includes('下课以后，去操场走两圈'))",'deleted absent from search');await closeTop();await click('刷新论坛并回到顶部');await check("![...document.querySelectorAll('.wall-post')].some(e=>e.innerText.includes('下课以后，去操场走两圈'))",'wall refresh cannot resurrect deleted post')
await check("document.querySelector('.wall-feed').innerText.includes('审核联动测试公开帖')",'public user post survives role switch');await click('评论审核联动测试公开帖');await click('删除我的动态');await check("!document.querySelector('.wall-feed').innerText.includes('审核联动测试公开帖')",'author can delete own shared post');await studentExit();await login('admin','A-DEMO-01');await click('反馈处理');await click('帖子审核');await select('筛选帖子审核状态','全部公开帖');await click('审核帖子：刚来学校？先收藏这份食堂路线');await check("document.querySelector('.moderation-reports').innerText.includes('暂无举报')",'unreported post can be reviewed');await fill('#moderation-reason','主动审核：发现违规广告，删除。');await click('删除违规帖');await click('确认删除')
for(const width of [320,390,430,1280]){await resize(width);await check('document.documentElement.scrollWidth<=innerWidth',width+'px moderation fits')}
await shot('admin-post-moderation');if(errors.length)throw Error(errors.join('\n'));console.log('Moderation integration checks passed')
} finally {ws.close()}
