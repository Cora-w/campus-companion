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
const shot = async name => { await writeFile('qa/screenshots/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64')) }
try {
 await call('Runtime.enable'); await call('Page.enable'); await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url:'http://127.0.0.1:5200'}); await wait(1500); await ev("localStorage.clear();localStorage.setItem('campus-login-school-v2','sichuan-aerospace-polytechnic')"); await call('Page.reload'); await wait(1200);
 await fill('#login-account','20260001'); await fill('#login-password','Demo@2026'); await ev("document.querySelector('.account-consent input').click()"); await click('登录'); await wait(1200);
 await click('零食铺子'); await wait(500);
 await check("![...document.querySelectorAll('.snack-shop-card button')].some(b=>/[→›]/.test(b.textContent))",'shop buttons have no decorative arrows');
 await check("!!document.querySelector('.snack-shop-card')",'shop cards displayed'); await shot('entry-style-shops'); await click('进店逛逛');
 await check("!document.querySelector('.snack-shop-card')",'shop entry still opens'); await ev('window.campusBack()'); await wait(500); await ev('window.campusBack()'); await wait(500);
 await click('我的'); await check("!!document.querySelector('.profile-campus-pass')",'profile displayed'); await shot('entry-style-profile');
 await ev("document.querySelector('.profile-campus-pass').click()"); await wait(500); await check("!!document.querySelector('.ant-drawer-open')",'profile entry still opens'); await ev('window.campusBack()'); await wait(500);
 await click('消息'); await click('打开与小林的聊天'); await click('聊天更多功能'); await check("!/[→›]/.test(document.querySelector('.chat-option-list').textContent)",'chat menu arrows removed');
 await ev("[...document.querySelectorAll('.chat-option-list button')].find(b=>b.textContent.includes('好友备注')).click()"); await wait(); await check("!!document.querySelector('#friend-remark')",'chat settings still open');
 await check('document.documentElement.scrollWidth<=innerWidth','mobile page fits'); if(errors.length)throw Error(errors.join(';')); console.log('Entry style checks passed');
} finally {ws.close()}