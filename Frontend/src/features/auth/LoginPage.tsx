import { registrationError } from './registration'
import { useBackNavigation } from '../../navigation/useBackNavigation'
import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Input, Select } from 'antd'
import type { Session } from '../../types/domain'
import { adminDemo, studentDemo, teacherDemo } from '../../mocks/auth'
import { roleNames } from '../../data/data'
import { authService, isDemoMode } from '../../services/auth'
import { Sheet } from '../../components/shared/Shared'
import './LoginPage.css'
import { schoolService } from '../../services/schools'
import type { School } from '../../types/school'
import { PasswordRecovery } from './PasswordRecovery'

// Public sample credentials only. Production authentication must be performed by the server.
const demoAccounts = [{ role: 'student', ...studentDemo }, { role: 'teacher', ...teacherDemo }, { role: 'admin', ...adminDemo }] as const
export function LoginPage({ onLogin, onPrivacy }: { onLogin: (session: Session) => void; onPrivacy: () => void }) {
  const [schools, setSchools] = useState<School[]>([])
  const [schoolId, setSchoolId] = useState(() => { try { return localStorage.getItem('campus-login-school-v2') || '' } catch { return '' } })
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [schoolsError, setSchoolsError] = useState('')
  const [schoolAttempt, setSchoolAttempt] = useState(0)
  const school = schools.find(item => item.id === schoolId)
  useEffect(() => {
    let active = true
    schoolService.list().then(items => { if (active) setSchools(items) }).catch(reason => { if (active) setSchoolsError(reason instanceof Error ? reason.message : '学校加载失败，请重试。') }).finally(() => { if (active) setSchoolsLoading(false) })
    return () => { active = false }
  }, [schoolAttempt])
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [registering,setRegistering]=useState(false)
  const [nickname,setNickname]=useState('')
  const [confirmation,setConfirmation]=useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [help, setHelp] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [samples, setSamples] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
  const switchMode=(next:boolean)=>{if(submitting.current)return;setRegistering(next);setPassword('');setConfirmation('');setError('');setSamples(false)}
  useBackNavigation(registering&&!loading,()=>switchMode(false),1000)
  const submit = async () => {
    if (submitting.current) return
    if (!school) { setError('请先选择学校。'); return }
    if (!account.trim()) { setError(registering?'请设置账号。':'请输入学校分配的学号或校园账号。'); return }
    if (!password) { setError('请输入密码。'); return }
    if (registering) { const invalid=registrationError({schoolId:school.id,account,password,nickname});if(invalid){setError(invalid);return}if(password!==confirmation){setError('两次输入的密码不一致。');return} }
    if (!consent) { setError('请先阅读并勾选隐私与身份说明。'); return }
    submitting.current = true
    setLoading(true)
    setError('')
    try {
      const session = registering ? await authService.register({schoolId:school.id,account:account.trim(),password,nickname:nickname.trim()}) : await authService.login({ schoolId: school.id, account: account.trim(), password })
      if (session.schoolId !== school.id) { await authService.logout(); setPassword(''); setError('登录学校与账号所属学校不一致，请重新选择。'); return }
      setPassword('')
      try { localStorage.setItem('campus-login-school-v2', school.id) } catch { /* Selection is already included in authenticated session. */ }
      onLogin({ ...session, schoolName: school.name, schoolCity: school.city })
    } catch (error) {
      setError(error instanceof Error ? error.message : registering?'注册失败，请重试。':'登录失败，请重试。')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }
  const schoolSelector = <div className="account-school-row"><label htmlFor="login-school">学校</label>
        <div className="account-school-field">
          <Select id="login-school" aria-label="登录学校" classNames={{ popup: { root: 'login-school-menu' } }} variant="borderless" showSearch={{ optionFilterProp: ['label', 'city'] }} placeholder={schoolsLoading ? '正在加载学校…' : '选择你的学校'} value={school?.id} loading={schoolsLoading} disabled={loading || schoolsLoading} onChange={value => { if (value !== schoolId) { setSchoolId(value); setAccount(''); setPassword(''); setError('') } }} options={schools.map(item => ({ value: item.id, label: item.name, city: item.city }))} notFoundContent="没有匹配的学校，试试校名或地区"/>
        </div>
      </div>
  if (recovering) return <PasswordRecovery schools={schools} initialSchoolId={schoolId} initialAccount={account} onClose={() => { setRecovering(false); setPassword(''); setError('') }} />
  return <main className={'account-login'+(registering?' account-register':'')} data-palette="clay">
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
    {registering&&<div className="account-register-heading"><h2>注册账号</h2><p>创建学生账号，开启你的校园生活</p></div>}<form className="account-form" onSubmit={e => { e.preventDefault(); submit() }} noValidate>
      {registering&&schoolSelector}<div className="account-fields">{registering&&<div className="account-field"><label htmlFor="register-nickname">昵称</label><Input id="register-nickname" autoComplete="nickname" disabled={loading} placeholder="2–20 个字，向同学展示的名字" value={nickname} maxLength={20} onChange={e=>{setNickname(e.target.value);setError('')}}/></div>}
        <div className="account-field">
          <label htmlFor="login-account">{registering?'设置账号':'学号 / 校园账号'}</label>
          <Input id="login-account" disabled={loading || (!registering&&!school)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={registering?'4–32 位字母、数字或下划线':school ? '请输入该校分配的账号' : '请先选择学校'} value={account} maxLength={64} onChange={e => { setAccount(e.target.value); setError('') }}/>
        </div>
        <div className="account-field">
          <div className="account-field-heading"><label htmlFor="login-password">{registering?'设置密码':'密码'}</label>{!registering&&<button type="button" disabled={loading} onClick={() => { setPassword(''); setRecovering(true) }}>忘记密码？</button>}</div>
          <Input.Password id="login-password" disabled={loading || !school} autoComplete={registering?'new-password':'current-password'} placeholder={registering?'8–64 位，包含字母和数字':'请输入密码'} value={password} maxLength={registering?64:128} onChange={e => { setPassword(e.target.value); setError('') }}/>
        </div>
      </div>
      {registering&&<div className="account-field account-confirm-password"><label htmlFor="register-confirm-password">确认密码</label><Input.Password id="register-confirm-password" disabled={loading} autoComplete="new-password" placeholder="再次输入密码" value={confirmation} maxLength={64} onChange={e=>{setConfirmation(e.target.value);setError('')}}/></div>}{!registering&&schoolSelector}
      {schoolsError && <p className="account-error account-school-error" role="alert">{schoolsError}<button type="button" onClick={() => { setSchoolsLoading(true); setSchoolsError(''); setSchoolAttempt(value => value + 1) }}>重新加载</button></p>}
      <div className="account-consent"><Checkbox checked={consent} onChange={e => { setConsent(e.target.checked); setError('') }} aria-label="我已阅读并了解隐私与身份说明"/><span>我已阅读并了解<button type="button" onClick={onPrivacy}>《隐私与身份说明》</button></span></div>
      {error && <p className="account-error" role="alert">{error}</p>}
      <Button className="account-submit" type="primary" htmlType="submit" loading={loading} block>{registering?'注册并登录':'登录'}</Button>
    </form>
    <p className="account-mode-switch">{registering?'已有账号？':'没有账号？'}<button type="button" disabled={loading} onClick={()=>switchMode(!registering)}>{registering?'直接登录':'注册账号'}</button></p>{registering&&<p className="account-registration-note">注册账号默认为学生身份。教师和管理员权限由学校分配。{isDemoMode&&'当前为本机演示注册，账号保存在此设备，请勿使用真实密码。'}</p>}
    {isDemoMode && !registering && <div className="account-demo"><span>当前为前端演示，请勿输入真实密码</span><button onClick={() => setSamples(!samples)} aria-expanded={samples}>演示账号 {samples ? '收起' : '查看'}</button>{samples && <div className="account-sample">{demoAccounts.map(demo => <div className="account-sample-row" key={demo.id}><div><b>{roleNames[demo.role]}演示账号</b><p>{demo.account} · 密码：{demo.password}</p></div><button aria-label={`填入${roleNames[demo.role]}演示账号`} disabled={loading} onClick={() => { setSchoolId(demo.schoolId); setAccount(demo.account); setPassword(demo.password); setError('') }}>填入账号</button></div>)}</div>}</div>}
    <p className="account-signature">发现校园的每一种可能</p>
    <Sheet title="登录帮助" open={help} onClose={() => setHelp(false)}><h3>账号与密码</h3><p>学生、心理教师和管理员可分别登录。先选择学校，再输入该校分配的学号或校园账号。没有账号可以在登录页点击“注册账号”。相同学号在不同学校属于不同账号；登录身份与权限由认证服务返回的账号角色决定，不需要手动选择身份。教师负责范围由学校分配。忘记密码或账号被停用时，请联系学校管理员。</p>{isDemoMode && <><p>当前为本地演示，可使用演示账号体验。</p><Button block onClick={() => { setHelp(false); setSamples(true) }}>查看演示账号</Button></>}</Sheet>
  </main>
}
