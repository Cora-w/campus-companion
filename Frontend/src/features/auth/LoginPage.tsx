import { useRef, useState } from 'react'
import { Button, Checkbox, Input } from 'antd'
import type { Session } from '../../types/domain'
import { studentDemo } from '../../mocks/auth'
import { authService, isDemoMode } from '../../services/auth'
import { Sheet } from '../../components/shared/Shared'
import './LoginPage.css'

// Public sample credentials only. Production authentication must be performed by the server.
const DEMO_PASSWORD = studentDemo.password
export function LoginPage({ onLogin, onPrivacy }: { onLogin: (session: Session) => void; onPrivacy: () => void }) {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [help, setHelp] = useState(false)
  const [samples, setSamples] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
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
      <h1>心伙伴<span>。</span></h1><p>你的校园，你的伙伴</p>
    </section>
    <form className="account-form" onSubmit={e => { e.preventDefault(); submit() }} noValidate>
      <div className="account-fields"><label htmlFor="login-account">账号</label><Input id="login-account" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="请输入学生账号" value={account} maxLength={64} onChange={e => { setAccount(e.target.value); setError('') }}/><label htmlFor="login-password">密码</label><Input.Password id="login-password" autoComplete="current-password" placeholder="请输入密码" value={password} maxLength={128} onChange={e => { setPassword(e.target.value); setError('') }}/></div>
      <div className="account-recovery"><span>使用学生账号登录</span><button type="button" onClick={() => setHelp(true)}>忘记密码？</button></div>
      <div className="account-consent"><Checkbox checked={consent} onChange={e => { setConsent(e.target.checked); setError('') }} aria-label="我已阅读并了解隐私与身份说明"/><span>我已阅读并了解<button type="button" onClick={onPrivacy}>《隐私与身份说明》</button></span></div>
      {error && <p className="account-error" role="alert">{error}</p>}
      <Button className="account-submit" type="primary" htmlType="submit" loading={loading} block>登录</Button>
    </form>
    {isDemoMode && <div className="account-demo"><span>当前为前端演示，请勿输入真实密码</span><button onClick={() => setSamples(!samples)} aria-expanded={samples}>演示账号 {samples ? '收起' : '查看'}</button>{samples && <div className="account-sample"><b>学生演示账号</b><p>{studentDemo.account}<br/>密码：{DEMO_PASSWORD}</p><button onClick={() => { setAccount(studentDemo.account); setPassword(DEMO_PASSWORD); setError('') }}>填入演示账号</button></div>}</div>}    <p className="account-signature">发现校园的每一种可能</p>
    <Sheet title="登录帮助" open={help} onClose={() => setHelp(false)}><h3>账号与密码</h3><p>当前开放学生端，请使用学生账号登录。忘记密码或账号被停用时，请联系学校管理员核验并重置。</p>{isDemoMode && <><p>当前为本地演示，可使用演示账号体验。</p><Button block onClick={() => { setHelp(false); setSamples(true) }}>查看演示账号</Button></>}</Sheet>
  </main>
}













