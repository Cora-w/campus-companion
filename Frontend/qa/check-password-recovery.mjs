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
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } console.log(await ev("JSON.stringify({text:document.body.innerText.slice(-400),at:[...document.elementsFromPoint(195,600)].slice(0,4).map(e=>e.className),scrolls:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50).slice(0,10).map(e=>({cls:e.className,top:e.scrollTop,h:e.clientHeight,sh:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))})")); throw Error(label) }
  const click = async label => { await ev(`(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(e=>e.getClientRects().length);const b=[...(modal||document).querySelectorAll('button')].find(e=>e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.split(' ').join('').trim()===${JSON.stringify(label.split(' ').join('').trim())}));if(!b||b.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});b.click()})()`); await wait() }
  const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }

  await call('Runtime.enable'); await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url:appUrl});await wait(1500);
  await check("!!document.querySelector('#login-account')",'login loaded');
  await click('忘记密码？');
  await check("!!document.querySelector('.password-recovery')&&!document.querySelector('.ant-drawer-open')",'dedicated page, no help overlay');
  for(const width of [320,390,430]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait();
    await check("document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.recovery-content input,.recovery-primary')].every(e=>{const r=e.getBoundingClientRect();return r.left>=16&&r.right<=innerWidth-16})",'layout '+width);
  }
  await click('获取验证码'); await check("document.querySelector('[role=alert]')?.innerText.includes('账号')||document.querySelector('[role=alert]')?.innerText.includes('学校')",'missing input validation');
  await click('手机号无法使用？');await check("!!document.querySelector('.recovery-support')",'help fallback');await click('返回找回密码');await click('返回登录');
  await check("!!document.querySelector('#login-account')",'back to login');
  // Mount the real component with a controlled transport double, to test stages without sending SMS.
  await ev(`(async()=>{const reactModule=await import('/node_modules/.vite/deps/react.js');const React=reactModule.default||reactModule;const domModule=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=domModule.default||domModule;const {PasswordRecovery}=await import('/src/features/auth/PasswordRecovery.tsx');const componentSource=await (await fetch('/src/features/auth/PasswordRecovery.tsx')).text();const servicePath=componentSource.split(String.fromCharCode(10)).find(line=>line.includes('from')&&line.includes('/services/passwordRecovery.ts')).split('"')[1];const {passwordRecovery}=await import(servicePath);window.recoveryCalls=[];passwordRecovery.sendCode=async input=>{window.recoveryCalls.push(['send',input]);return {challengeId:'test-challenge',maskedPhone:'138****0000',retryAfter:60}};passwordRecovery.verify=async(id,code)=>{window.recoveryCalls.push(['verify',id,code]);if(code!=='123456')throw Error('验证码不正确或已过期');return 'test-reset-token'};passwordRecovery.reset=async(token,password)=>{window.recoveryCalls.push(['reset',token,password])};document.querySelector('#root').style.display='none';const host=document.createElement('div');host.style.maxWidth='480px';host.style.margin='auto';document.body.append(host);createRoot(host).render(React.createElement(PasswordRecovery,{schools:[{id:'school-test',name:'测试学校'}],initialSchoolId:'school-test',initialAccount:'20260001',onClose:()=>window.recoveryClosed=true}));})()`);await wait();
  await fill('#recovery-phone','13800000000');await click('获取验证码');await check("!!document.querySelector('#recovery-code')",'code stage after server challenge');
  await fill('#recovery-code','000000');await click('验证并继续');await check("document.querySelector('[role=alert]')?.innerText.includes('验证码不正确')&&!document.querySelector('#recovery-password')",'incorrect code blocks reset');
  await fill('#recovery-code','123456');await click('验证并继续');await check("!!document.querySelector('#recovery-password')",'verified token unlocks password');
  await fill('#recovery-password','NewPass123');await fill('#recovery-confirm','Mismatch123');await click('确认重置密码');await check("document.querySelector('[role=alert]')?.innerText.includes('不一致')&&!window.recoveryCalls.some(x=>x[0]==='reset')",'mismatch does not submit');
  await fill('#recovery-confirm','NewPass123');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait();
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(new URL('./screenshots/password-recovery-reset.png',import.meta.url),Buffer.from(shot.data,'base64'));
  await click('确认重置密码');await check("document.body.innerText.includes('密码已重置')&&window.recoveryCalls.some(x=>x[0]==='reset'&&x[1]==='test-reset-token')&&!document.querySelector('#recovery-password')",'reset success only after transport completes');
  await click('返回登录');await check("window.recoveryClosed===true",'completion returns to login');
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
