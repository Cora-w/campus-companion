import { useRef, useState } from 'react'
import { Button, Checkbox, Dropdown, Input } from 'antd'
import type { Role, Session } from '../../types/domain'
import { adminDemo, studentDemo, teacherDemo } from '../../mocks/auth'
import { roleNames } from '../../data/data'
import { authService, isDemoMode } from '../../services/auth'
import { Sheet } from '../../components/shared/Shared'
import './LoginPage.css'
import { buildInfo } from '../../config/buildInfo'

// Public sample credentials only. Production authentication must be performed by the server.
const rolesAvailable = ['student', 'teacher', 'admin']
const DEMO_PASSWORD = studentDemo.password
type LoginRole = Exclude<Role, 'merchant'>
const LOGIN_ROLE_KEY = 'campus-login-role-v1'
function readLastLoginRole(): LoginRole {
  try {
    const saved = localStorage.getItem(LOGIN_ROLE_KEY)
    if (saved === 'student' || saved === 'teacher' || saved === 'admin') return saved
  } catch { /* Keep login available when browser storage is unavailable. */ }
  return 'student'
}
export function LoginPage({ onLogin, onPrivacy }: { onLogin: (session: Session) => void; onPrivacy: () => void }) {
  const [role, setRole] = useState<LoginRole>(readLastLoginRole)
  const [identityOpen, setIdentityOpen] = useState(false)
  const demo = role === 'admin' ? adminDemo : role === 'teacher' ? teacherDemo : studentDemo
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [help, setHelp] = useState(false)
  const [samples, setSamples] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
  const selectRole = (value: LoginRole) => {
    setRole(value)
    try { localStorage.setItem(LOGIN_ROLE_KEY, value) } catch { /* Selection still works without persistence. */ }
    setError('')
    setIdentityOpen(false)
  }
  const submit = async () => {
    if (submitting.current) return
    if (!account.trim()) { setError('请输入账号。'); return }
    if (!password) { setError('请输入密码。'); return }
    if (!consent) { setError('请先阅读并勾选隐私与身份说明。'); return }
    submitting.current = true
    setLoading(true)
    setError('')
    try {
      const session = await authService.login({ account: account.trim(), password })
      if (session.role !== role) { await authService.logout(); setPassword(''); setError('账号身份与所选类别不一致，请选择正确的登录身份。'); return }
      setPassword('')
      onLogin(session)
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败，请重试。')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }
  return <main className="account-login" data-palette="clay">
    <div className="login-topbar"><span>校园生活 · 随时相伴</span><button onClick={() => setHelp(true)}>登录帮助</button></div>
    <section className="account-brand" aria-label="心伙伴">
      <svg className="companion-logo" viewBox="0 0 80 80" role="img" aria-label="心伙伴标志：并肩交汇的双轨">
        <rect x="1" y="1" width="78" height="78" rx="25" fill="var(--login-strong)"/>
        <path d="M23 54V33c0-9 6-15 14-15h6v9h-6c-3 0-5 2-5 6v21Z" fill="#fff9f1"/>
        <path d="M57 26v21c0 9-6 15-14 15h-6v-9h6c3 0 5-2 5-6V26Z" fill="var(--theme-tint)"/>
        <path d="m28 45 23-15v10L28 55Z" fill="#fff9f1"/>
      </svg>
      <h1>心伙伴</h1><p>你的校园，你的伙伴</p>
    </section>
    <form className="account-form" onSubmit={e => { e.preventDefault(); submit() }} noValidate>
      <div className="account-fields">
        <div className="account-field">
          <label htmlFor="login-account">账号</label>
          <Input id="login-account" disabled={loading} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="请输入账号" value={account} maxLength={64} onChange={e => { setAccount(e.target.value); setError('') }}/>
        </div>
        <div className="account-field">
          <div className="account-field-heading"><label htmlFor="login-password">密码</label><button type="button" onClick={() => setHelp(true)}>忘记密码？</button></div>
          <Input.Password id="login-password" disabled={loading} autoComplete="current-password" placeholder="请输入密码" value={password} maxLength={128} onChange={e => { setPassword(e.target.value); setError('') }}/>
        </div>
      </div>
      <div className="account-identity"><span>登录身份：<b>{roleNames[role]}</b></span><Dropdown trigger={['click']} placement="bottomRight" open={identityOpen} onOpenChange={setIdentityOpen} menu={{ selectable: true, selectedKeys: [role], items: (['student', 'teacher', 'admin'] as const).map(value => ({ key: value, label: roleNames[value] })), onClick: ({ key }) => selectRole(key as LoginRole) }}><button type="button" disabled={loading} aria-haspopup="menu" aria-expanded={identityOpen}>切换身份<span className="account-identity-arrow" aria-hidden="true">⌄</span></button></Dropdown></div>
      <div className="account-consent"><Checkbox checked={consent} onChange={e => { setConsent(e.target.checked); setError('') }} aria-label="我已阅读并了解隐私与身份说明"/><span>我已阅读并了解<button type="button" onClick={onPrivacy}>《隐私与身份说明》</button></span></div>
      {error && <p className="account-error" role="alert">{error}</p>}
      <Button className="account-submit" type="primary" htmlType="submit" loading={loading} block>登录</Button>
    </form>
    {isDemoMode && <div className="account-demo"><span>当前为前端演示，请勿输入真实密码</span><button onClick={() => setSamples(!samples)} aria-expanded={samples}>演示账号 {samples ? '收起' : '查看'}</button>{samples && <div className="account-sample">{rolesAvailable.includes(role) ? <><b>{roleNames[role]}演示账号</b><p>{demo.account}<br/>密码：{DEMO_PASSWORD}</p><button disabled={loading} onClick={() => { setAccount(demo.account); setPassword(DEMO_PASSWORD); setError('') }}>填入演示账号</button></> : <p>请选择登录身份查看演示账号。</p>}</div>}</div>}    <p className="account-signature">发现校园的每一种可能</p>
    <Sheet title="登录帮助" open={help} onClose={() => setHelp(false)}><p className="subtle">版本 {buildInfo.version} · {buildInfo.revision.slice(0, 8)}{buildInfo.dirty ? ' · 含本地修改' : ''}</p><h3>账号与密码</h3><p>学生、心理教师和管理员可分别登录。教师账号及负责范围由管理员分配；选择身份不会授予权限。忘记密码或账号被停用时，请联系学校管理员。</p>{isDemoMode && <><p>当前为本地演示，可使用演示账号体验。</p><Button block onClick={() => { setHelp(false); setSamples(true) }}>查看演示账号</Button></>}</Sheet>
  </main>
}













