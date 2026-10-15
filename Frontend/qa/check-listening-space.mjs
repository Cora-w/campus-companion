import { writeFile } from 'node:fs/promises'
const target = await (await fetch((process.env.LISTENING_QA_CDP || 'http://127.0.0.1:9368') + '/json/new?about:blank',{method:'PUT'})).json()
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
 await call('Runtime.enable');await call('Page.enable');await resize(390);await call('Page.navigate',{url:process.env.LISTENING_QA_URL || 'http://127.0.0.1:5199'});await wait(1400);
 await ev("localStorage.clear();localStorage.setItem('campus-login-school-v2','sichuan-aerospace-polytechnic');for(const id of ['S-DEMO-01','T-DEMO-01','A-DEMO-01'])localStorage.setItem('campus-school-v1:'+id,'sichuan-aerospace-polytechnic')");await call('Page.reload');await wait(1200);await login('student','S-DEMO-01');
 for(let i=0;i<50&&!await ev("!!document.querySelector('.wall-feed')");i++){if(await ev("!!document.querySelector('input[name=school]')")){await ev("document.querySelector('input[name=school]').click()");await wait();await click('确认学校，进入校园')}await wait(100)}
 await click('倾诉空间');await wait(500);
 await check("!!document.querySelector('.ls-entry')&&document.querySelectorAll('.ls-shortcuts button').length===3",'approved entry contains compact composer and three capsules');
 await check("getComputedStyle(document.querySelector('.ls-window')).backgroundImage.includes('warm-window')",'window photo bundled locally');await shot('listening-entry');
 const fitsListening=async label=>{await check("(()=>{const d=document.querySelector('.listening-space-root.ant-drawer-open');const w=d.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect(),b=d.querySelector('.ant-drawer-body');return w.width<=Math.min(innerWidth,480)+1&&b.scrollWidth<=b.clientWidth+1})()",label)};
 for(const width of [320,390,430,966]){await resize(width);await fitsListening('entry fits '+width);await check("(()=>{const b=document.querySelectorAll('.ls-shortcuts button');return b[0].getBoundingClientRect().top===b[2].getBoundingClientRect().top})()",'capsules stay on one row '+width)}await resize(390);
 await fill('[aria-label=倾诉内容]','我跟室友吵架了，烦死了');await click('发送倾诉消息');
 await check("!!document.querySelector('.ls-chat')&&!document.querySelector('.ls-window')&&document.querySelectorAll('.ls-bubble').length===2",'first send opens clean chat without scenery');
 await fill('[aria-label=倾诉内容]','我想睡觉，他一直放视频，提醒他还说我事多');await click('发送倾诉消息');await shot('listening-chat');
 await fill('[aria-label=倾诉内容]','我不知道怎么开口');await click('发送倾诉消息');await check("!document.querySelector('.ls-suggestions')&&document.querySelector('.ls-messages').textContent.includes('处理办法')",'advice is offered before options are shown');
 await fill('[aria-label=倾诉内容]','你好');await click('发送倾诉消息');await check("!document.querySelector('.ls-suggestions')",'unrelated text cannot grant consent');
 await fill('[aria-label=倾诉内容]','可以');await click('发送倾诉消息');await check("document.querySelectorAll('.ls-suggestions li').length===3",'explicit consent reveals optional suggestions');
 await fill('[aria-label=倾诉内容]','保留还没发出的草稿');await ev('window.campusBack()');await wait(400);await check("!!document.querySelector('.ls-entry')&&document.querySelector('[aria-label=倾诉内容]').value==='保留还没发出的草稿'",'chat back returns to entry and preserves draft');
 await click('继续刚才的对话');await check("document.querySelector('[aria-label=倾诉内容]').value==='保留还没发出的草稿'",'resume restores conversation and draft');
 await ev("document.querySelector('[aria-label=倾诉内容]').focus()");await wait(300);await call('Emulation.setDeviceMetricsOverride',{width:390,height:420,deviceScaleFactor:1,mobile:true});await wait(400);
 await check("document.querySelector('.ls-chat-bottom').getBoundingClientRect().bottom<=421",'composer remains visible in simulated keyboard viewport');await ev("document.activeElement.blur()");await resize(390);await wait(400);
 await click('倾诉空间更多');await click('我的记忆');await check("document.querySelector('[aria-label=开启倾诉记忆]').getAttribute('aria-checked')==='false'&&document.querySelector('[aria-label=想记住的内容]').disabled",'memory starts disabled');
 await ev("document.querySelector('[aria-label=开启倾诉记忆]').click()");await wait();await fill('[aria-label=想记住的内容]','难受时希望先听我说');await click('确认保存这段文字');await check("document.querySelectorAll('.ls-memory-item').length===1",'memory saves only on confirmation');
 await click('修改');await fill('[aria-label=想记住的内容]','先倾听，不急着给建议');await click('确认保存这段文字');await check("document.querySelector('.ls-memory-item').textContent.includes('先倾听')",'memory can be edited');
 await ev('window.campusBack()');await wait(300);await ev('window.campusBack()');await wait(300);await check("document.querySelector('.ls-memory-reminder').textContent.includes('先倾听')",'enabled memory shown honestly as local reminder');
 await click('倾诉空间更多');await click('我的记忆');await click('删除');await ev('window.campusBack()');await wait(300);await ev('window.campusBack()');await wait(300);await check("!document.querySelector('.ls-memory-reminder')",'deleted memory stops being displayed');
 await click('倾诉空间更多');await click('聊后感受');await click('更难受');await click('查看真人支持');await check("document.querySelector('.ls-emergency').textContent.includes('12356')",'feedback can lead to human and emergency support');
 await fill('[aria-label=给老师的留言]','希望通过文字先聊一聊');await check("document.querySelector('.ls-share-preview').textContent.includes('希望通过文字')&&document.querySelector('.ls-panel-copy button[type=submit]').disabled",'sharing requires preview and explicit authorization');
 await ev("document.querySelector('.ls-consent input').click()");await wait();await click('确认记录授权留言（演示）');await check("document.querySelector('.ls-support-status').textContent.includes('希望通过文字')",'authorized local request is recorded');await shot('listening-support');
 for(let i=0;i<4&&await ev("!!document.querySelector('.ls-panel-root.ant-drawer-open')");i++){await ev('window.campusBack()');await wait(300)}await click('倾诉空间更多');await click('重新开始');await ev('window.campusBack()');await wait(400);await check("document.querySelectorAll('.ls-bubble').length>0",'system back cancels destructive reset');
 await click('重新开始');await click('清空并重新开始');await check("!!document.querySelector('.ls-entry')&&!document.querySelector('.ls-resume')&&!document.querySelector('[aria-label=倾诉内容]').value",'confirmed reset clears conversation and draft');
 await click('轻松聊聊');await check("document.querySelector('.ls-messages').textContent.includes('轻松的话题')",'casual entrance opens a natural starter');await ev('window.campusBack()');await wait(300);await ev('window.campusBack()');await wait(400);await check("!document.querySelector('.listening-space-root.ant-drawer-open')&&!!document.querySelector('.wall-feed')",'entry returns cleanly to campus home');
 await studentExit();await login('teacher','T-DEMO-01');await wait(600);await check("![...document.querySelectorAll('.campus-hub-entries button')].some(b=>b.textContent==='倾诉空间')",'teacher has no private student listening entry');await studentExit();await login('student','S-DEMO-01');await wait(600);await click('倾诉空间');await check("!document.querySelector('.ls-resume')",'logout clears private conversation state');
 if(errors.length)throw Error(errors.join(';'));console.log('Listening experience checks passed');
} finally {ws.close()}
