import { writeFile } from 'node:fs/promises'
const target = await (await fetch('http://127.0.0.1:9378/json/new?about:blank',{method:'PUT'})).json()
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
const resize = async width => { await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); await wait() }
const exit = async () => { await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(500) }
try {
 await call('Runtime.enable'); await call('Page.enable'); await resize(390);
 await call('Page.navigate', {url:'http://127.0.0.1:5200'}); await wait(1500);
 await ev("localStorage.clear();localStorage.setItem('campus-login-school-v2','sichuan-aerospace-polytechnic');localStorage.setItem('campus-login-role-v1','admin')"); await call('Page.reload'); await wait(1200);
 await check("![...document.querySelectorAll('button')].some(b=>b.textContent.includes('切换身份')) && !document.querySelector('.account-identity')",'manual identity selector removed');
 for(const [account,section] of [['20260001',null],['20261001','心理教师服务'],['20262001','校园管理服务']]) {
  await fill('#login-account',account); await fill('#login-password','Demo@2026'); await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1100); await click('我的');
  await check(section ? `!!document.querySelector('[aria-label="${section}"]')` : "!document.querySelector('.profile-staff-section')", account+' receives only authenticated role');
  if(account==='20260001') {
   await click('消息'); await click('打开与小林的聊天'); await click('聊天更多功能'); await ev("[...document.querySelectorAll('.chat-option-list button')].find(b=>b.textContent.includes('好友备注')).click()"); await wait(); await fill('#friend-remark','天地无敌世界最强黑洞之宇宙霸王龙'); await click('保存备注');
   await ev('window.campusBack()'); await wait(500); await ev('window.campusBack()'); await wait(600);
   for(const width of [320,390,430]) {
    await resize(width);
    await check("(()=>{const n=document.querySelector('.conversation-name');const row=n.closest('.conversation-row');const meta=row.querySelector('.conversation-meta');return n.textContent.includes('天地无敌')&&n.getBoundingClientRect().width>150&&meta.getBoundingClientRect().width<=64&&row.scrollWidth<=row.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth})()",'long name and metadata fit '+width+'px');
   }
   await resize(390); await writeFile('qa/screenshots/login-layout-messages.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  }
  await exit();
 }
 if(errors.length)throw Error(errors.join(';')); console.log('Login and name layout checks passed');
} finally { ws.close() }