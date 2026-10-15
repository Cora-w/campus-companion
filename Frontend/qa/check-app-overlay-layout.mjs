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
  const check = async (expression, label) => { for (let retry = 0; retry < 30; retry++) { if (await ev(expression)) { console.log('PASS ' + label); return } await wait() } console.log(await ev("JSON.stringify({text:document.body.innerText.slice(-400),at:[...document.elementsFromPoint(195,600)].slice(0,4).map(e=>e.className),scrolls:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50).slice(0,10).map(e=>({cls:e.className,top:e.scrollTop,h:e.clientHeight,sh:e.scrollHeight,overflow:getComputedStyle(e).overflowY}))})")); await shot('pinch-test-failure'); throw Error(label) }
  const click = async label => { await ev(`(()=>{const modal=[...document.querySelectorAll('.ant-modal')].find(e=>e.getClientRects().length);const front=document.querySelector('.ant-drawer-open[data-viewport-active=\"true\"]');const b=[...(modal||front||document).querySelectorAll('button')].find(e=>e.getClientRects().length&&(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent.split(' ').join('').trim()===${JSON.stringify(label.split(' ').join('').trim())}));if(!b||b.disabled)throw Error('Missing/disabled button '+${JSON.stringify(label)});b.click()})()`); await wait() }
  const fill = async (selector, value) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await wait() }
  const login = async role => {
    await check("!!document.querySelector('#login-account')", 'login ready')
    await click('演示账号 查看'); await click({student:'填入学生演示账号',teacher:'填入心理教师演示账号',admin:'填入管理员演示账号'}[role]);
    await ev("document.querySelector('.account-consent input').click()"); await click('登录')
    await check("!!document.querySelector('.wall-feed')", role + ' signed in')
  }
  const close = async () => { await ev("[...document.querySelectorAll('.ant-drawer-open .ant-drawer-close')].at(-1).click()"); await wait(600) }
  const teacherLogout = async () => { await click('我的'); await click('退出教师账号'); await wait(800) }
  const studentLogout = async () => { await close(); await click('我的'); await click('打开设置'); await click('退出当前身份'); await click('确认退出'); await wait(800) }
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(new URL(`screenshots/${name}.png`, import.meta.url), Buffer.from(result.data, 'base64')) }
  const tap = async selector => { await ev(`document.querySelector(${JSON.stringify(selector)}).click()`); await wait(650) }
  let audited = 0
  const audit = async (label, widths = [320,390,430,1209]) => {
    for (const width of widths) {
      await call('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:1, mobile:width<600 }); await wait(650)
      const result = await ev(`(()=>{
        const rows=[...document.querySelectorAll('.ant-drawer-open')].map(root=>{
          const wrapper=root.querySelector(':scope > .ant-drawer-content-wrapper');if(!wrapper)return null;
          const r=wrapper.getBoundingClientRect();const body=root.querySelector('.ant-drawer-body');
          const matrix=new DOMMatrix(getComputedStyle(wrapper).transform);const active=root.dataset.viewportActive==='true';
          const footer=active?root.querySelector('.ant-drawer-footer'):null;const f=footer?.getBoundingClientRect();
          return {title:root.querySelector('.ant-drawer-title')?.textContent,width:r.width,left:r.left,top:r.top,bottom:r.bottom,tx:matrix.m41,ty:matrix.m42,overflow:body?body.scrollWidth-body.clientWidth:0,side:root.classList.contains('ant-drawer-right')||root.classList.contains('ant-drawer-left'),active,footerBottom:f?.bottom};
        }).filter(Boolean);
        return {viewport:innerWidth,height:innerHeight,rows,documentOverflow:document.documentElement.scrollWidth-innerWidth}
      })()`)
      const left=Math.max(0,(width-480)/2), phoneWidth=Math.min(480,width)
      const bad=result.rows.find(r=>Math.abs(r.width-phoneWidth)>1||Math.abs(r.left-left)>1||Math.abs(r.tx)>1||Math.abs(r.ty)>1||r.overflow>1||(r.active&&r.side&&(Math.abs(r.top)>1||Math.abs(r.bottom-result.height)>1))||(r.footerBottom!==undefined&&r.footerBottom>result.height+1))
      if(bad||result.documentOverflow>1){await shot('overlay-layout-failure');throw Error(label+' '+width+'px '+JSON.stringify(result))}
    }
    audited++; console.log('PASS layout '+label)
  }
  const closeTop = async () => { await ev("document.querySelector('.ant-drawer-open[data-viewport-active=\"true\"] .ant-drawer-close').click()"); await wait(650) }
  const start = async role => { await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Page.navigate',{url:appUrl});await wait(1300);await login(role) }
  const allClosed = async () => { for(let i=0;i<8&&await ev("!!document.querySelector('.ant-drawer-open')");i++)await closeTop() }
  const visit = async (label, action, nested) => { await action();await audit(label);if(nested)await nested();await allClosed() }
  const keyboard = async (label,selector) => {
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait();await ev('document.querySelector('+JSON.stringify(selector)+').focus()');await wait()
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:425,deviceScaleFactor:1,mobile:true});await wait(900)
    const state=await ev("(()=>{const root=document.querySelector('.ant-drawer-open[data-viewport-active=\"true\"]');const wrapper=root.querySelector(':scope > .ant-drawer-content-wrapper');const footer=root.querySelector('.ant-drawer-footer');const r=wrapper.getBoundingClientRect();return {top:r.top,bottom:r.bottom,footer:footer?.getBoundingClientRect().bottom,height:innerHeight,parents:[...document.querySelectorAll('.ant-drawer-open .ant-drawer-content-wrapper')].map(e=>new DOMMatrix(getComputedStyle(e).transform).m41)}})()")
    if(state.bottom>state.height+1||state.top< -1||state.footer>state.height+1||state.parents.some(x=>Math.abs(x)>1))throw Error('Keyboard layout '+label+' '+JSON.stringify(state))
    console.log('PASS keyboard '+label);await shot('app-keyboard-'+label);await ev('document.activeElement.blur()');await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(700)
  }
  await call('Runtime.enable');await call('Page.enable')
  if(!['extras','deep'].includes(process.env.APP_AUDIT_SCOPE)) {
  await start('admin');await click('我的')
  for(const label of ['账号管理','开店授权','校园通知','反馈处理','帖子举报与违规审核','管理资料与操作记录']) {
    await visit('管理员 '+label,()=>click(label),async()=>{
      if(label==='校园通知') {
        await click('新建通知');await audit('通知编辑（嵌套工作区）');await shot('app-notice-editor-aligned')
        await fill('#campus-notice-title','布局回归草稿');await fill('#campus-notice-body','验证通知详情和编辑页的完整覆盖。');await click('保存草稿');await wait()
        await tap('[aria-label="查看通知：布局回归草稿"]');await audit('通知详情');await click('编辑通知');await audit('通知详情内再次编辑（三级页面）');await closeTop();await closeTop()
      }
      if(label==='账号管理') { await tap('[data-account-id="T-DEMO-01"]');await audit('账号详情');await click('编辑陈老师');await audit('账号编辑（三级页面）');await closeTop();await closeTop() }
      if(label==='开店授权') { const button=await ev("document.querySelector('.admin-shop-students [role=\"button\"]')?.getAttribute('aria-label')");if(button){await tap('.admin-shop-students [role="button"]');await audit('店铺授权详情');await closeTop()} }
      if(label==='管理资料与操作记录') { await tap('.admin-record-entry');await audit('操作记录（嵌套工作区）');await shot('app-admin-records-aligned');await closeTop() }
    })
  }
  await start('teacher');await click('我的')
  for(const label of ['心理支持工作台','预警中心','学生支持档案','咨询日程','教师服务设置']) {
    await visit('教师 '+label,()=>click(label),async()=>{
      if(label==='学生支持档案') { await tap('[aria-label="查看同学 B支持档案"]');await audit('学生支持档案详情');await click('约谈该学生');await audit('档案发起约谈');await closeTop() }
      if(label==='咨询日程') { await click('新增预约');await audit('新增约谈');await closeTop() }
    })
  }
  await start('student')
  for(const label of ['校园指南','校园闲置','活动搭子','零食铺子']) await visit('学生 '+label,()=>click(label),async()=>{
    if(label==='零食铺子'){await click('进入下课零食社');await audit('零食店详情');await click('添加海盐脆薯片');await click('去结算');await audit('零食结算');await allClosed()}
  })
  await click('消息');await tap('.inbox-ai');await audit('AI 聊天');await tap('[aria-label="聊天更多功能"]');await audit('聊天设置');await allClosed()
  await click('我的')
  for(const [label,selector] of [['编辑个人资料','[aria-label="编辑个人资料"]'],['学校详情','.profile-campus-pass'],['设置','[aria-label="打开设置"]'],['约谈邀请','[aria-label="我的约谈"]'],['零食订单','.profile-order-entry']]) await visit(label,()=>tap(selector))
  await click('帮助与反馈');await audit('帮助与反馈');await click('提出建议或反馈问题');await audit('提交反馈');await allClosed()
  }
  if(!['main','deep'].includes(process.env.APP_AUDIT_SCOPE)) {
    await start('admin');await click('我的');await click('校园通知');await click('新建通知');await keyboard('notice-editor','#campus-notice-body');await allClosed()
    await click('管理资料与操作记录');await click('操作记录');await keyboard('operation-records','[aria-label="搜索操作日志"]');await allClosed()
    await start('student');await visit('倾诉空间',()=>click('倾诉空间'))
    await click('消息');await tap('.conversation-row[aria-label^="打开与"]');await audit('好友聊天');await tap('[aria-label="聊天更多功能"]');await audit('好友聊天设置');await click('查找聊天记录');await audit('聊天记录搜索');await keyboard('chat-search','[aria-label="搜索聊天记录"]');await allClosed()
    await visit('通讯录',()=>click('通讯录'),async()=>{await tap('.contact-panel .request-entry');await audit('黑名单')})
    await visit('新的朋友',()=>click('新的朋友'))
    for(const label of ['添加好友','创建群聊']) {await click('添加好友或创建群聊');await ev('[...document.querySelectorAll(\".ant-dropdown-menu-item\")].find(e=>e.innerText==='+JSON.stringify(label)+').click()');await wait(650);await audit(label);await allClosed()}
  }
  if(!['main','extras'].includes(process.env.APP_AUDIT_SCOPE)) {
    await start('student');await click('我的');await tap('[aria-label="编辑个人资料"]');await keyboard('personal-editor','#profile-edit-form input:not([type="file"])');await allClosed()
    await click('首页');await tap('.wall-actions button[aria-label^="评论"]');await audit('帖子详情');await click('举报');await audit('举报帖子');await allClosed()
    await click('发现');await audit('发现首页');await click('进店看看');await audit('探店详情');await tap('.discover-product-info');await audit('探店商品详情');await tap('.discover-back');await tap('.discover-write-bar button');await audit('写探店评价');await closeTop();await allClosed()
    await click('好玩');await tap('.outing-content');await audit('地点详情');await allClosed()
    await click('发布');await audit('发布日常');
  }
  console.log('Audited '+audited+' screens at 320/390/430/1209px; covered pages stay in place and visible footers remain inside the screen.')
}finally{page?.ws.close();await browser.call('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
