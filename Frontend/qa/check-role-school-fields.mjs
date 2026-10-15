import { writeFile } from 'node:fs/promises'

const cdp = process.env.CAMPUS_QA_CDP || 'http://127.0.0.1:9335'
const url = process.env.CAMPUS_QA_URL || 'http://127.0.0.1:5173'
const target = await (await fetch(`${cdp}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener('message', event => {
  const result = JSON.parse(event.data)
  if (result.method === 'Runtime.exceptionThrown') errors.push(result.params.exceptionDetails.text)
  if (!result.id) return
  const request = pending.get(result.id)
  pending.delete(result.id)
  if (result.error) request.reject(result.error)
  else request.resolve(result.result)
})
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const next = ++id
  pending.set(next, { resolve, reject })
  ws.send(JSON.stringify({ id: next, method, params }))
})
const ev = async expression => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const wait = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))
const waitFor = async expression => {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await ev(expression)) return
    await wait(100)
  }
  throw Error('Timed out: ' + expression)
}
const check = async (label, expression) => {
  if (!await ev(expression)) throw Error(label)
  console.log('PASS ' + label)
}
const click = async selector => { await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`); await ev(`document.querySelector(${JSON.stringify(selector)}).click()`); await wait(450) }
const fill = async (selector, value) => {
  await ev(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await wait(100)
}
try {
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await call('Page.navigate', { url }); await waitFor("!!document.querySelector('#login-account')")
  for (const [role, number] of [['student', '20260001'], ['teacher', '20261001'], ['admin', '20262001']]) {
    await ev(`localStorage.setItem('campus-login-school-v2','sichuan-aerospace-polytechnic');localStorage.setItem('campus-login-role-v1','${role}')`)
    await call('Page.reload'); await wait(500); await waitFor("!!document.querySelector('#login-account')&&!document.querySelector('#login-account').disabled")
    await fill('#login-account', number); await fill('#login-password', 'Demo@2026')
    await click('.account-consent input'); await click('.account-submit'); await waitFor("!!document.querySelector('.bottom-nav')")
    await click('.bottom-nav [aria-label="我的"]'); await click('.profile-campus-pass')
    const fields = await ev("[...document.querySelectorAll('.permission-row b')].map(e=>e.textContent)")
    const studentFields = ['学院', '专业', '年级', '班级']
    if (role === 'student') {
      if (!studentFields.every(field => fields.includes(field))) throw Error('student school details missing')
    } else if (studentFields.some(field => fields.includes(field))) throw Error(role+' has student-only fields')
    console.log('PASS '+role+' school detail fields')
    await check(role+' has one authenticated account row', `document.querySelectorAll('.permission-row').length===${role === 'student' ? 9 : 5}&&[...document.querySelectorAll('.permission-row')].filter(e=>e.textContent.includes('${number}')).length===1`)
    if (role !== 'student') await check(role+' uses staff identity wording', "!document.querySelector('.ant-drawer-open .ant-alert').textContent.includes('学号')&&!document.querySelector('.ant-drawer-open .ant-alert').textContent.includes('负责你的')")
    if (role === 'admin') await writeFile('qa/screenshots/admin-school-details.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'))
    await ev('window.campusBack()'); await wait(450); await click('.personal-edit')
    for (const field of studentFields) await check(role+' editor '+field, `!!document.querySelector('.profile-editor-page [aria-label="${field}"]')===${role === 'student'}`)
    if (role !== 'student') await check(role+' editor account wording', "document.querySelector('.profile-editor-page').textContent.includes('校园账号由登录身份确定')&&!document.querySelector('.profile-editor-page').textContent.includes('负责你的教师')")
    await ev('window.campusBack()'); await wait(500)
  }
  if(errors.length) throw Error(errors.join('; '))
} finally {
  ws.close()
  await fetch(`${cdp}/json/close/${target.id}`)
}
