import { IdentityProvider } from './features/identity/IdentityProvider'
import { SchoolGate } from './features/auth/SchoolGate'
import { useBackNavigation } from './navigation/useBackNavigation'
import { installViewportTracking } from './layout/viewport'
import { authService, clearSavedLogin } from './services/auth'
import { AppearanceContext, appearanceKey, readTheme, themes } from './theme/appearance'
import type { ThemeId } from './theme/appearance'
import './theme/appearance.css'
import { CommerceContext } from './features/commerce/commerce'
import { useCommerceStore } from './features/commerce/useCommerceStore'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, ConfigProvider, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { Account, Audit, CareCase, Session } from './data/data'
import { initialAccounts, nowLabel, roleNames, uid } from './data/data'
import { Icon, Sheet } from './components/shared/Shared'
const StudentArea = lazy(() => import('./features/student/StudentArea').then(module => ({ default: module.StudentArea })))
import type { StudentPage } from './features/student/StudentArea'
const TeacherArea = lazy(() => import('./features/teacher/TeacherArea').then(module => ({ default: module.TeacherArea })))
import { StudentInvitations } from './features/student/StudentInvitations'
import { invitationResponse } from './features/student/invitationResponse'
import type { InvitationReply } from './features/student/invitationResponse'
import { apiConfig } from './config/env'
import { useStoredAppointments } from './features/student/useStoredAppointments'
import { teacherCases } from './features/teacher/teacherData'
const AdminArea = lazy(() => import('./features/admin/AdminArea').then(module => ({ default: module.AdminArea })))
import type { SupportRequest } from './data/hubData'
import './App.css'
import { CommunityProvider } from './features/moderation/CommunityProvider'
import { CampusOperationsProvider } from './features/admin/CampusOperations'
import { createProductCssProperties } from './theme/productTheme'
import './theme/productTheme.css'
import { syncDemoAccounts } from './mocks/auth'
import { registeredAccounts } from './mocks/registeredAccounts'
import { Drawer } from './navigation/BackOverlays'
import { canOpenStaffTarget, staffEntries } from './navigation/workspaceNavigation'
import type { StaffTarget } from './navigation/workspaceNavigation'
import { isCampusRole } from './types/access'
import './layout/CampusWorkspace.css'
import { LoginPage } from './features/auth/LoginPage'

type Page = StudentPage
const studentNav = [{ page: 'home', label: '首页', icon: 'home' }, { page: 'services', label: '发现', icon: 'location' }, { page: 'publish', label: '发布', icon: 'plus' }, { page: 'chat', label: '消息', icon: 'chat' }, { page: 'profile', label: '我的', icon: 'profile' }]
const pageTitles: Record<Page, string> = { home: '心伙伴', services: '校园发现', publish: '发布动态', chat: '消息', profile: '我的' }

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [themeId, setThemeId] = useState(readTheme)
  const [themeSaved, setThemeSaved] = useState(true)
  const palette = themes.find(theme => theme.id === themeId) || themes[0]
  const chooseTheme = (id: ThemeId) => {
    setThemeId(id)
    try { localStorage.setItem(appearanceKey, id); setThemeSaved(true) } catch { setThemeSaved(false) }
  }
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [name, value] of Object.entries(createProductCssProperties(palette))) root.style.setProperty(name, value)
    root.dataset.theme = palette.id
    root.style.setProperty('--accent', palette.accent)
    root.style.setProperty('--accent-soft', palette.soft)
    root.style.setProperty('--canvas', palette.canvas)
    root.style.setProperty('--theme-tint', palette.tint)
  }, [palette])
  const [promotion,setPromotion] = useState({enabled:true,title:'下课了，来点零食。'})
  const [accounts, setAccounts] = useState<Account[]>(()=>apiConfig.mode === 'mock' ? [...initialAccounts,...registeredAccounts()] : initialAccounts)
  const { shops, orders:shopOrders, placeOrder, changeOrderStatus, canManageShop, managedShopId, saveShop, moderateShop } = useCommerceStore(session, accounts)
  const [page, setPage] = useState<Page>('home')
  const [pageTrail, setPageTrail] = useState<{page:Page;scroll:number}[]>([])
  const rootPage: Page = 'home'
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [staffTarget, setStaffTarget] = useState<StaffTarget | null>(null)
  const [workspaceTrail, setWorkspaceTrail] = useState<StaffTarget[]>([])
  const openWorkspace = (target: StaffTarget) => {
    if (!canOpenStaffTarget(session?.role, target)) return
    setStaffTarget(target); setWorkspaceTrail([]); setWorkspaceOpen(true)
  }
  const goWorkspace = (target: StaffTarget) => {
    if (!canOpenStaffTarget(session?.role, target) || !staffTarget || target.page === staffTarget.page) return
    setWorkspaceTrail(previous => [...previous, staffTarget]); setStaffTarget(target)
  }
  useLayoutEffect(() => {
    if (workspaceOpen) requestAnimationFrame(() => document.querySelector('.campus-workspace > .ant-drawer-body, .campus-workspace .ant-drawer-body')?.scrollTo(0, 0))
  }, [workspaceOpen, staffTarget])
  const backWorkspace = () => {
    const previous = workspaceTrail.at(-1)
    if (previous) { setWorkspaceTrail(trail => trail.slice(0, -1)); setStaffTarget(previous) }
    else setWorkspaceOpen(false)
  }
  useBackNavigation(true, () => {
    if (!session || !pageTrail.length) return
    const previous = pageTrail.at(-1)
    setPageTrail(prev => prev.slice(0,-1)); setPage(previous?.page ?? rootPage)
    requestAnimationFrame(() => window.scrollTo(0,previous?.scroll ?? 0))
  },0)
  // Every new app visit starts at login; clear legacy remembered credentials.
  useEffect(clearSavedLogin, [])
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const requestSupport = (topic: string) => {
    if (session?.role !== 'student') return
    const teacher = accounts.find(a => a.schoolId === session.schoolId && a.role === 'teacher' && a.enabled)
    if (!teacher) return
    setRequests(prev => prev.some(r => r.studentId === session.id && r.status === '待联系') ? prev : [{ id: uid(), teacherId: teacher.id, studentId: session.id, studentName: accounts.find(a => a.id === session.id)?.name || session.name, topic, time: nowLabel(), status: '待联系' }, ...prev])
  }
  const [cases, setCases] = useState<CareCase[]>(teacherCases)
  const [invitationNow, setInvitationNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setInvitationNow(Date.now()), 60000); return () => window.clearInterval(timer) }, [])
  const [appointments, setAppointments] = useStoredAppointments(apiConfig.mode === 'mock')
  useEffect(() => syncDemoAccounts(accounts), [accounts])
  const [audits, setAudits] = useState<Audit[]>([])
  const [inbox, setInbox] = useState(false)
  const [invitationsOpen, setInvitationsOpen] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  useEffect(installViewportTracking, [])
  const log = (action: string, actor = session ? `${roleNames[session.role]} · ${session.id}` : '演示访客') => setAudits(prev => [{ id: uid(), time: nowLabel(), actor, action }, ...prev])
  const go = (target: Page) => { if (target === page) return; setPageTrail(prev => target === rootPage ? [] : [...prev,{page,scroll:window.scrollY}]); setPage(target); window.scrollTo(0, 0) }
  const login = (next: Session) => {
    if (apiConfig.mode === 'mock') setAccounts(previous => previous.some(account => account.id === next.id) ? previous : [...previous, { id: next.id, schoolId: next.schoolId, name: next.name, role: next.role, enabled: true }])
    setPageTrail([]); setSession(next); setPage('home'); setWorkspaceOpen(false); setStaffTarget(null); setWorkspaceTrail([])
    log('账号登录', roleNames[next.role] + ' · ' + next.id)
  }
  const logout = async () => {
    try { await authService.logout() }
    catch { void message.error('服务端退出未确认，已清除本机登录状态。') }
    finally { log('退出登录'); setSession(null); setPageTrail([]); setWorkspaceOpen(false); setStaffTarget(null); setWorkspaceTrail([]); setInbox(false); setInvitationsOpen(false); window.scrollTo(0, 0) }
  }
  const isChat = false
  const nav = studentNav
  const pageSurface = useRef<HTMLElement>(null)
  const previousPage = useRef(page)
  useLayoutEffect(() => {
    const previous = previousPage.current
    previousPage.current = page
    const surface = pageSurface.current
    if (!surface || previous === page) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches) return
    const direction = nav.findIndex(item => item.page === page) >= nav.findIndex(item => item.page === previous) ? 1 : -1
    const animation = surface.animate([
      { opacity: 0.35, transform: `translateX(${direction * 12}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)' })
    const stop = () => { if (motion.matches) animation.cancel() }
    motion.addEventListener('change', stop)
    return () => { animation.cancel(); motion.removeEventListener('change', stop) }
  }, [page, nav])
  const teacherRequests = requests.filter(r => r.teacherId === session?.id)
  const studentAppointments = session?.role === 'student' ? appointments.filter(item => item.studentAccountId === session.id && cases.some(student => student.id === item.caseId && student.schoolId === session.schoolId && student.studentAccountId === session.id)) : []
  const invitationCount = studentAppointments.filter(item => item.status === '已安排' && item.responseStatus === '待确认' && new Date(`${item.day}T${item.start}:00+08:00`).getTime() > invitationNow).length
  const teacherName = (id: string) => accounts.find(account => account.id === id)?.name || '心理老师'
  const respondToInvitation = (id: string, reply: InvitationReply) => {
    const item = studentAppointments.find(value => value.id === id)
    if (session?.role !== 'student') return '请使用学生账号回应。'
    const result = invitationResponse(item, session.id, reply)
    if (result.error || !result.appointment) return result.error
    setAppointments(previous => previous.map(value => value.id === id && value.studentAccountId === session.id ? result.appointment! : value))
    log(`学生${reply.status === '已接受' ? '接受约谈邀请' : reply.status === '已婉拒' ? '婉拒约谈邀请' : '申请约谈改期'} ${id}`)
    return ''
  }
  const pendingWork = cases.filter(c => c.teacherId === session?.id && c.schoolId === session?.schoolId && c.status === '待处理').length
  return <ConfigProvider locale={zhCN} wave={{ disabled:true }} theme={{ token: { colorPrimary: palette.accent, colorInfo: palette.accent, colorSuccess: '#248a3d', colorWarning: '#996000', colorError: '#c9342b', borderRadius: 12, controlHeight: 44, fontSize: 14, colorText: '#242321', colorTextSecondary: '#66635f', colorTextPlaceholder: '#77716a', colorBgContainer: '#ffffff', colorBgLayout: palette.canvas, colorBorder: palette.tint, fontFamily: 'inherit' }, components: { Button: { primaryShadow: 'none' }, Drawer: { footerPaddingBlock: 16 }, Input: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, InputNumber: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, DatePicker: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, Select: { optionSelectedBg: palette.soft, activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeOutlineColor: 'transparent' } } }}>
    <IdentityProvider session={session} accounts={accounts} setAccounts={setAccounts} cases={cases}><CommunityProvider session={session} accounts={accounts} log={log}><CampusOperationsProvider session={session} accounts={accounts} log={log}>
    <AppearanceContext.Provider value={{ themeId, choose: chooseTheme, saved: themeSaved }}>
    <CommerceContext.Provider value={{shops,orders:shopOrders,placeOrder,changeOrderStatus,promotion,setPromotion,studentId:session && isCampusRole(session.role)?session.id:'',canManageShop,managedShopId,saveShop,moderateShop}}>
    <div className={`app-shell ${!session ? 'login-shell' : ''} ${isChat ? 'chatting' : ''}`}>
      {!session ? <LoginPage onLogin={login} onPrivacy={() => setShowPrivacy(true)}/> : <SchoolGate key={session.id} session={session} logout={logout}>
        <header className="mobile-header">{page === 'home' ? <div className="mobile-brand"><b>心伙伴</b><span>你的校园生活</span></div> : <div className="header-title"><button className="icon-button" aria-label="返回上一页" onClick={() => window.campusBack?.()}><Icon name="back"/></button><h1>{pageTitles[page]}</h1></div>}<button className="icon-button notification" aria-label="服务消息" onClick={() => setInbox(true)}><Icon name="bell"/></button></header>
        <div className="main-shell page-switch-shell"><main ref={pageSurface}><Suspense fallback={<p className="loading-page" role="status">正在准备你的校园空间…</p>}>
          <StudentArea key={session.id} inbox={inbox} closeInbox={() => setInbox(false)} page={page} go={go} session={session} logout={logout} requests={requests.filter(r => r.studentId === session.id)} requestSupport={requestSupport} openInvitations={() => setInvitationsOpen(true)} invitationCount={invitationCount} openWorkspace={openWorkspace} pendingWork={pendingWork}/>
        </Suspense><footer>心伙伴 · 发现校园，分享生活<small>校园生活交互原型 · 数据为演示</small></footer></main></div>
        <nav className="bottom-nav" aria-label="底部导航">{nav.map(item => <button key={item.page} className={`${page === item.page ? 'selected' : ''} ${item.page === 'chat' ? 'ai-tab' : ''}`} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} onClick={() => go(item.page as Page)}><span className="tab-icon"><Icon name={item.icon}/></span><span>{item.label}</span></button>)}</nav>
        <Drawer zIndex={700} rootClassName="campus-workspace-overlay" className="campus-workspace" placement="right" size="min(480px, 100vw)" open={workspaceOpen && !!staffTarget && canOpenStaffTarget(session.role, staffTarget)} onClose={backWorkspace} title={staffTarget ? staffEntries(staffTarget.role).find(entry => entry.target.page === staffTarget.page)?.label : undefined}>
          <Suspense fallback={<p className="loading-page" role="status">正在准备工作功能…</p>}>
            {session.role === 'teacher' && staffTarget?.role === 'teacher' && <div className="teacher-shell-host"><TeacherArea embedded page={staffTarget.page} go={target => goWorkspace({ role: 'teacher', page: target })} session={session} logout={logout} cases={cases} setCases={setCases} appointments={appointments} setAppointments={setAppointments} log={log} requests={teacherRequests} acceptRequest={id => setRequests(previous => previous.map(r => r.id === id && r.teacherId === session.id ? { ...r, status: '已受理' } : r))}/></div>}
            {session.role === 'admin' && staffTarget?.role === 'admin' && <div className="admin-shell-host"><AdminArea embedded page={staffTarget.page} go={target => goWorkspace({ role: 'admin', page: target })} accounts={accounts} setAccounts={setAccounts} audits={audits} log={log} session={session} logout={logout}/></div>}
          </Suspense>
        </Drawer>
      </SchoolGate>}
    </div>
    <Sheet fullScreen title="我的约谈" open={invitationsOpen && session?.role === 'student'} onClose={() => setInvitationsOpen(false)}><div className="student-appointments-page"><StudentInvitations now={invitationNow} appointments={studentAppointments} teacherName={teacherName} onRespond={respondToInvitation}/></div></Sheet>
    <Sheet title="隐私与身份说明" open={showPrivacy} onClose={() => setShowPrivacy(false)}><p>校园墙、评论和好友资料只公开头像与昵称，不公开真实姓名和学号；管理员同样不能查看这些身份信息。负责该学生的授权心理教师可在本校服务档案中查看真实姓名与学号。AI 对话不公开。正式心理支持服务将必要的分析摘要、趋势、预警与报告仅提供给授权心理教师，学生端不展示评估结果。教师和管理员的工作功能不能读取其他人的私人聊天。</p><Alert type="info" title="当前仅为前端演示" description="真实权限校验、传输及存储加密、风险分析、推送和留痕由后端实现。页面演示不代表这些服务已完成。"/><p className="subtle spaced">本次个人对话、非公开记录和收藏在退出时清空；公开帖子、举报和审核结果在本次访问中保留，供管理员处理。已授权的联系请求、虚构教师档案与系统操作日志在本次演示中保留，刷新后恢复样例。</p></Sheet>
    </CommerceContext.Provider>
    </AppearanceContext.Provider>
    </CampusOperationsProvider></CommunityProvider></IdentityProvider>
  </ConfigProvider>
}
export default App
