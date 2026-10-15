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
const ready=async selector=>{for(let attempt=0;attempt<60;attempt++){if(await ev(`!!document.querySelector(${JSON.stringify(selector)})`))return;await wait(250)}throw Error(`Not ready: ${selector}`)};
const resize=async width=>{await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await wait()}
const shot=async name=>{await writeFile('qa/screenshots/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
try {
 await call('Runtime.enable'); await call('Page.enable'); await resize(390); await call('Page.navigate',{url:'http://127.0.0.1:5200'}); await wait(1500);await ev("localStorage.clear();localStorage.setItem('campus-login-school-v2','sichuan-aerospace-polytechnic')");await call('Page.reload');await wait(1000);
 await ready('#login-account');await fill('#login-account','20261001');await fill('#login-password','Demo@2026');await ev("document.querySelector('.account-consent input').click()");await click('登录');await wait(1200);await click('我的');await ready('[aria-label=心理支持工作台]');await click('心理支持工作台');await ready('.staff-agenda-row');
 for(const width of [320,390,480]) {
  await resize(width);
  await check("(()=>{const row=document.querySelector('.staff-agenda-row'),time=row.querySelector('.staff-agenda-time'),body=row.querySelector('.staff-agenda-body');const a=time.getBoundingClientRect(),b=body.getBoundingClientRect();return b.left-a.right>=15&&Math.abs(time.querySelector('b').getBoundingClientRect().top-body.querySelector('b').getBoundingClientRect().top)<1&&row.scrollWidth<=row.clientWidth+1&&getComputedStyle(time.querySelector('small')).marginBottom==='0px'})()",'agenda spacing fits '+width);
 }
 await resize(390);await ev("document.querySelector('.tw-today-panel').scrollIntoView({block:'center'})");await wait();await shot('teacher-agenda-spacing');await ev('window.campusBack()');await wait(500);await click('学生支持档案');await ready('.staff-student-search');
 for(const width of [320,390,480]) { await resize(width);await check("(()=>{const search=document.querySelector('.staff-student-search'),icon=search.querySelector('.ant-input-prefix'),input=search.querySelector('input'),a=icon.getBoundingClientRect(),b=input.getBoundingClientRect();return b.left-a.right>=9&&Math.abs(a.top+a.height/2-b.top-b.height/2)<2&&search.getBoundingClientRect().height>=44&&search.scrollWidth<=search.clientWidth+1&&!document.querySelector('.tw-roster-toolbar .ant-input-search-button')})()",'search spacing fits '+width) }
 await resize(390);await fill('[aria-label=搜索关怀学生]','同学 B');await check("document.querySelector('.tw-roster-page').textContent.includes('同学 B')&&!document.querySelector('.tw-roster-page').textContent.includes('同学 A')",'live student search still filters');await shot('teacher-search-spacing');
 if(errors.length)throw Error(errors.join(';'));console.log('Teacher spacing checks passed');
} catch(error) {console.log(await ev("document.body.innerText"));console.log(errors);throw error} finally {ws.close()}