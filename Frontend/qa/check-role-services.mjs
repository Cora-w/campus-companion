import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://127.0.0.1:9358/json/new?about:blank',{method:'PUT'})).json()
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
const login = async (kind,account) => { await role(kind); await fill('#login-account',account); await fill('#login-password','Demo@2026'); await ev("if(!document.querySelector('.account-consent input').checked)document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1000) }
const studentExit = async () => { await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(500) }
const closeTop = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].filter(b=>b.getClientRects().length).at(-1).click()"); await wait(500) }

const tab=async label=>{await ev("[...document.querySelectorAll('.bottom-nav button')].find(b=>b.getAttribute('aria-label')==="+JSON.stringify(label)+").click()");await wait()}
const fits=async label=>{await check('document.documentElement.scrollWidth<=innerWidth',label+' page fits');await check("(()=>{const d=[...document.querySelectorAll('.ant-drawer-open')].at(-1);if(!d)return true;const w=d.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect(),b=d.querySelector('.ant-drawer-body');return w.width<=Math.min(innerWidth,480)+1&&b.scrollWidth<=b.clientWidth+1})()",label+' overlay fits')}
const staffClose=async()=>{await ev('window.campusBack()');await wait(600)}
try {
await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:'http://127.0.0.1:5198'});await wait(1800);await ev("localStorage.clear();for(const id of ['A-DEMO-01','S-DEMO-01','T-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')");await call('Page.reload');await wait(1500);
const serviceRows="[...document.querySelectorAll('.campus-unified-search section')].find(s=>s.querySelector('h3').textContent.startsWith('校园服务'))";
for(const [kind,account,label,selector] of [['student','S-DEMO-01','倾诉空间','.listening-space'],['teacher','T-DEMO-01','咨询日程','[aria-label=日程日期]'],['admin','A-DEMO-01','反馈处理','[aria-label=搜索校园反馈]']]){
 await login(kind,account);await wait(600);
 await check("[...document.querySelectorAll('.campus-hub-entries button')].some(b=>b.textContent==="+JSON.stringify(label)+")",kind+' home has correct replacement');
 if(kind!=='student')await check("![...document.querySelectorAll('.campus-hub-entries button')].some(b=>b.textContent==='倾诉空间')",kind+' has no student listening shortcut');
 await click(label);await wait(500);await check('!!document.querySelector('+JSON.stringify(selector)+')',kind+' shortcut opens real functional page');
 if(kind==='student'){await fill('[aria-label=倾诉内容]','学生倾诉入口回归检查');await ev("document.querySelector('.listen-composer').requestSubmit()");await wait();await check("document.querySelector('.listen-messages').textContent.includes('学生倾诉入口回归检查')",'student listening still sends');}
 await fits(kind+' shortcut');await ev('window.campusBack()');await wait(600);await check("!document.querySelector('.ant-drawer-open')&&!!document.querySelector('.wall-feed')",kind+' back returns to campus without stale overlay');
 await ev("document.querySelector('[aria-label=搜索校园内容]').click()");await wait(400);await fill('[aria-label=校园搜索关键词]','倾诉');
 await check(serviceRows+".querySelectorAll('.search-result-row').length==="+(kind==='student'?1:0),kind+' search enforces student-only listening');
 await fill('[aria-label=校园搜索关键词]',label);await check(serviceRows+".textContent.includes("+JSON.stringify(label)+")",kind+' replacement discoverable in search');
 await ev(serviceRows+".querySelector('.search-result-row').click()");await wait(600);await check('!!document.querySelector('+JSON.stringify(selector)+')',kind+' search opens correct destination');
 await check("!document.querySelector('.campus-unified-search')",kind+' search closes before opening destination');await ev('window.campusBack()');await wait(600);await check("!document.querySelector('.ant-drawer-open')",kind+' search destination returns cleanly');
 await click('我的');await click('帮助与反馈');await check("document.querySelector('.profile-help').textContent.includes("+JSON.stringify(kind==='teacher'?'咨询日程':kind==='admin'?'反馈处理':'倾诉空间')+")",kind+' help matches actual service');await ev('window.campusBack()');await wait(400);await studentExit();
}
if(errors.length)throw Error(errors.join(';'));console.log('Role service UI checks passed');
} finally {ws.close()}
