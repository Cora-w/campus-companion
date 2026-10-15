import { useEffect, useRef, useState } from 'react'
import { Button, Input, Select } from 'antd'
import { Icon } from '../../components/shared/Shared'
import { useBackNavigation } from '../../navigation/useBackNavigation'
import { passwordRecovery } from '../../services/passwordRecovery'
import type { School } from '../../types/school'
import './PasswordRecovery.css'

export function PasswordRecovery({ schools, initialSchoolId, initialAccount, onClose }: { schools: School[]; initialSchoolId: string; initialAccount: string; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [schoolId, setSchoolId] = useState(initialSchoolId)
  const [account, setAccount] = useState(initialAccount)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState({ challengeId: '', maskedPhone: '' })
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [support, setSupport] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retryAt, setRetryAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const pending = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => { if (!retryAt) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [retryAt])
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000))
  const back = () => {
    if (pending.current) return
    if (support) { setSupport(false); return }
    if (step === 0 || step === 3) { onClose(); return }
    setStep(0); setError(''); setCode(''); setToken(''); setPassword(''); setConfirm(''); setChallenge({ challengeId: '', maskedPhone: '' })
  }
  useBackNavigation(true, back, 1100)
  const send = async () => {
    if (!schoolId) throw new Error('请选择账号所属学校。')
    if (!account.trim()) throw new Error('请输入要找回的学号或校园账号。')
    if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请输入账号已绑定的 11 位手机号。')
    if (remaining) throw new Error(`请在 ${remaining} 秒后重新获取验证码。`)
    const result = await passwordRecovery.sendCode({ schoolId, account: account.trim(), phone })
    if (!active.current) return
    setChallenge(result); setCode(''); setNow(Date.now()); setRetryAt(Date.now() + Math.max(1, result.retryAfter) * 1000); setStep(1)
  }
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try { await action() } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : '操作失败，请重试。') }
    finally { pending.current = false; if (active.current) setBusy(false) }
  }
  const submit = () => run(async () => {
    if (step === 0) { await send(); return }
    if (step === 1) {
      if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位短信验证码。')
      const resetToken = await passwordRecovery.verify(challenge.challengeId, code)
      if (active.current) { setToken(resetToken); setCode(''); setStep(2) }
      return
    }
    if (password.length < 8 || password.length > 64 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('密码需为 8–64 位，包含字母和数字。')
    if (password !== confirm) throw new Error('两次输入的密码不一致，请重新确认。')
    await passwordRecovery.reset(token, password)
    if (active.current) { setPassword(''); setConfirm(''); setToken(''); setStep(3) }
  })
  const headings = ['找回密码', '验证身份', '设置新密码', '密码已重置']
  return <main className="password-recovery">
    <header className="recovery-nav"><button type="button" aria-label="返回登录" disabled={busy} onClick={back}><Icon name="back" /></button><span>{support ? '无法验证？' : '找回密码'}</span><span className="recovery-nav-spacer" /></header>
    <div className="recovery-content">
      {support ? <section className="recovery-support"><div className="recovery-symbol"><Icon name="help" /></div><h1>联系学校管理员</h1><p>如果手机号已停用、尚未绑定手机，或无法接收验证码，请联系账号所属学校的辅导员或信息中心，核实身份后协助重置密码。</p><div className="recovery-school-note">所属学校<b>{schools.find(s => s.id === schoolId)?.name || '请向账号所属学校咨询'}</b></div><Button block type="primary" onClick={() => setSupport(false)}>返回找回密码</Button></section> : <>
        {step < 3 && <ol className="recovery-steps" aria-label="找回密码进度">{['确认账号', '验证身份', '设置密码'].map((label, i) => <li key={label} className={i <= step ? 'is-active' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Icon name="check" /> : i + 1}</span>{label}</li>)}</ol>}
        <section className="recovery-heading"><div className="recovery-symbol"><Icon name={step === 3 ? 'check' : 'shield'} /></div><h1>{headings[step]}</h1><p>{step === 0 ? '确认你的校园账号，验证后即可重新设置密码。' : step === 1 ? `验证码已发送至 ${challenge.maskedPhone}` : step === 2 ? '身份验证已通过，为账号设置一个新密码。' : '请使用新密码重新登录，继续你的校园生活。'}</p></section>
        {step === 3 ? <Button type="primary" block className="recovery-primary" onClick={onClose}>返回登录</Button> : <form noValidate onSubmit={e => { e.preventDefault(); submit() }}>
          <fieldset disabled={busy}>
            {step === 0 && <><label htmlFor="recovery-school">学校</label><Select id="recovery-school" aria-label="找回密码的学校" showSearch={{ optionFilterProp: 'label' }} value={schoolId || undefined} placeholder="选择账号所属学校" disabled={busy} options={schools.map(s => ({ label: s.name, value: s.id }))} onChange={v => { setSchoolId(v); setError('') }} /><label htmlFor="recovery-account">学号 / 校园账号</label><Input id="recovery-account" autoComplete="username" placeholder="请输入要找回的账号" value={account} maxLength={64} onChange={e => { setAccount(e.target.value); setError('') }} /><label htmlFor="recovery-phone">绑定手机号</label><Input id="recovery-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="请输入账号已绑定的手机号" value={phone} maxLength={11} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }} /><p className="recovery-hint">通过绑定手机号验证，保护你的账号安全。</p></>}
            {step === 1 && <><label htmlFor="recovery-code">短信验证码</label><Input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" placeholder="输入 6 位验证码" value={code} maxLength={6} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }} /><div className="recovery-resend"><span>没有收到短信？</span><button type="button" disabled={busy || remaining > 0} onClick={() => run(send)}>{remaining > 0 ? `${remaining} 秒后重新获取` : '重新获取验证码'}</button></div></>}
            {step === 2 && <><label htmlFor="recovery-password">新密码</label><Input.Password id="recovery-password" autoComplete="new-password" placeholder="8–64 位，包含字母和数字" value={password} maxLength={64} onChange={e => { setPassword(e.target.value); setError('') }} /><label htmlFor="recovery-confirm">确认新密码</label><Input.Password id="recovery-confirm" autoComplete="new-password" placeholder="再次输入新密码" value={confirm} maxLength={64} onChange={e => { setConfirm(e.target.value); setError('') }} /><p className="recovery-hint">请勿使用学号、生日等容易被猜到的密码。</p></>}
          </fieldset>
          {error && <p className="recovery-error" role="alert">{error}</p>}
          <Button type="primary" block htmlType="submit" loading={busy} className="recovery-primary">{step === 0 ? '获取验证码' : step === 1 ? '验证并继续' : '确认重置密码'}</Button>
          <button className="recovery-help" type="button" disabled={busy} onClick={() => setSupport(true)}>手机号无法使用？</button>
        </form>}
      </>}
    </div><p className="recovery-footer">心伙伴 · 账号安全</p>
  </main>
}
