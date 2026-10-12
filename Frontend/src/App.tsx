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
import { Alert, Button, ConfigProvider, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { Account, Audit, CareCase, Session } from './data/data'
import { initialAccounts, nowLabel, roleNames, uid } from './data/data'
import { Icon, Sheet } from './components/shared/Shared'
const StudentArea = lazy(() => import('./features/student/StudentArea').then(module => ({ default: module.StudentArea })))
import type { StudentPage } from './features/student/StudentArea'
const TeacherArea = lazy(() => import('./features/teacher/TeacherArea').then(module => ({ default: module.TeacherArea })))
import type { TeacherPage } from './features/teacher/TeacherArea'
import { StudentInvitations } from './features/student/StudentInvitations'
import { invitationResponse } from './features/student/invitationResponse'
import type { InvitationReply } from './features/student/invitationResponse'
import { apiConfig } from './config/env'
import { useStoredAppointments } from './features/student/useStoredAppointments'
import { teacherCases } from './features/teacher/teacherData'
const AdminArea = lazy(() => import('./features/admin/AdminArea').then(module => ({ default: module.AdminArea })))
import type { AdminPage } from './features/admin/AdminArea'
import type { SupportRequest } from './data/hubData'
import './App.css'
import { CommunityProvider } from './features/moderation/CommunityProvider'
import { CampusOperationsProvider } from './features/admin/CampusOperations'
import { StudentNotices } from './features/admin/CampusServiceViews'
import { createProductCssProperties } from './theme/productTheme'
import './theme/productTheme.css'
import { syncDemoAccounts } from './mocks/auth'
import { LoginPage } from './features/auth/LoginPage'

type Page = StudentPage | TeacherPage | AdminPage
const studentNav = [{ page: 'home', label: '首页', icon: 'home' }, { page: 'services', label: '发现', icon: 'location' }, { page: 'publish', label: '发布', icon: 'plus' }, { page: 'chat', label: '消息', icon: 'chat' }, { page: 'profile', label: '我的', icon: 'profile' }]
const teacherNav = [{ page: 'workbench', label: '工作台', icon: 'home' }, { page: 'care', label: '学生关怀', icon: 'shield' }, { page: 'profile', label: '我的', icon: 'profile' }]
const adminNav = [{ page: 'accounts', label: '账号管理', icon: 'users' }, { page: 'shops', label: '开店授权', icon: 'shield' }, { page: 'announcements', label: '校园通知', icon: 'bell' }, { page: 'feedback', label: '反馈处理', icon: 'chat' }, { page: 'profile', label: '我的', icon: 'profile' }]
const pageTitles: Record<Page, string> = { home: '心伙伴', services: '校园发现', publish: '发布动态', chat: '消息', profile: '我的', workbench: '心理教师工作台', care: '学生档案', triage: '预警中心', schedule: '咨询日程', accounts: '账号管理', shops: '开店授权', announcements: '校园通知', feedback: '反馈处理' }

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
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const { shops, orders:shopOrders, placeOrder, changeOrderStatus, canManageShop, managedShopId, saveShop, moderateShop } = useCommerceStore(session, accounts)
  const [page, setPage] = useState<Page>('home')
  const [pageTrail, setPageTrail] = useState<{page:Page;scroll:number}[]>([])
  const rootPage: Page = session?.role === 'teacher' ? 'workbench' : session?.role === 'admin' ? 'accounts' : 'home'
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
    setRequests(prev => prev.some(r => r.studentId === session.id && r.status === '待联系') ? prev : [{ id: uid(), teacherId: 'T-DEMO-01', studentId: session.id, studentName: session.name, topic, time: nowLabel(), status: '待联系' }, ...prev])
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
    setPageTrail([]); setSession(next); setPage(next.role === 'student' ? 'home' : next.role === 'teacher' ? 'workbench' : 'accounts')
    log('账号登录', roleNames[next.role] + ' · ' + next.id)
  }
  const logout = async () => {
    try { await authService.logout() }
    catch { void message.error('服务端退出未确认，已清除本机登录状态。') }
    finally { log('退出登录'); setSession(null); setPageTrail([]); setInbox(false); setInvitationsOpen(false); window.scrollTo(0, 0) }
  }
  const isChat = false
  const nav = session?.role === 'teacher' ? teacherNav : session?.role === 'admin' ? adminNav : studentNav
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
  const studentAppointments = session?.role === 'student' ? appointments.filter(item => item.studentAccountId === session.id && cases.some(student => student.id === item.caseId && student.studentAccountId === session.id)) : []
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
  const pendingHigh = cases.filter(c => c.teacherId === session?.id && c.risk === '高' && c.status === '待处理').length
  return <ConfigProvider locale={zhCN} wave={{ disabled:true }} theme={{ token: { colorPrimary: palette.accent, colorInfo: palette.accent, colorSuccess: '#248a3d', colorWarning: '#996000', colorError: '#c9342b', borderRadius: 12, controlHeight: 44, fontSize: 14, colorText: '#242321', colorTextSecondary: '#66635f', colorTextPlaceholder: '#77716a', colorBgContainer: '#ffffff', colorBgLayout: palette.canvas, colorBorder: palette.tint, fontFamily: 'inherit' }, components: { Button: { primaryShadow: 'none' }, Drawer: { footerPaddingBlock: 16 }, Input: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, InputNumber: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, DatePicker: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, Select: { optionSelectedBg: palette.soft, activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeOutlineColor: 'transparent' } } }}>
    <CommunityProvider session={session} accounts={accounts} log={log}><CampusOperationsProvider session={session} accounts={accounts} log={log}>
    <AppearanceContext.Provider value={{ themeId, choose: chooseTheme, saved: themeSaved }}>
    <CommerceContext.Provider value={{shops,orders:shopOrders,placeOrder,changeOrderStatus,promotion,setPromotion,studentId:session?.role==='student'?session.id:'',canManageShop,managedShopId,saveShop,moderateShop}}>
    {session?.role === 'teacher' ? <div className="teacher-shell-host"><SchoolGate key={session.id} session={session} logout={logout}><Suspense fallback={<p className="loading-page" role="status">正在准备教师工作空间…</p>}><TeacherArea page={page as TeacherPage} go={go} session={session} logout={logout} cases={cases} setCases={setCases} appointments={appointments} setAppointments={setAppointments} log={log} requests={teacherRequests} acceptRequest={id => setRequests(prev => prev.map(r => r.id === id && r.teacherId === session.id ? { ...r, status: '已受理' } : r))}/></Suspense></SchoolGate></div> :
    session?.role === 'admin' ? <div className="admin-shell-host"><SchoolGate key={session.id} session={session} logout={logout}><Suspense fallback={<p className="loading-page" role="status">正在准备管理中心…</p>}><AdminArea page={page as AdminPage} go={go} accounts={accounts} setAccounts={setAccounts} audits={audits} log={log} session={session} logout={logout}/></Suspense></SchoolGate></div> :
    <div className={`app-shell ${!session ? 'login-shell' : ''} ${isChat ? 'chatting' : ''}`}>
      {!session ? <LoginPage onLogin={login} onPrivacy={() => setShowPrivacy(true)}/> : <SchoolGate key={session.id} session={session} logout={logout}>
        <header className="mobile-header">{page === 'home' ? <div className="mobile-brand"><b>心伙伴</b><span>你的校园生活</span></div> : <div className="header-title">{page !== rootPage && <button className="icon-button" aria-label="返回上一页" onClick={() => window.campusBack?.()}><Icon name="back"/></button>}<h1>{pageTitles[page]}</h1></div>}<button className="icon-button notification" aria-label="服务消息" onClick={() => setInbox(true)}><Icon name="bell"/></button></header>
        <div className="main-shell page-switch-shell"><main ref={pageSurface}><Suspense fallback={<p className="loading-page" role="status">正在准备你的空间…</p>}>
          {session.role === 'student' && <StudentArea page={page as StudentPage} go={go} session={session} logout={logout} requests={requests} requestSupport={requestSupport} openInvitations={() => setInvitationsOpen(true)} invitationCount={invitationCount}/>}
          </Suspense>{!isChat && <footer>心伙伴 · 发现校园，分享生活<small>手机端交互原型 · 全部数据为演示</small></footer>}
        </main></div>
        {!isChat && <nav className="bottom-nav" aria-label="底部导航" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>{nav.map(item => <button key={item.page} className={`${page === item.page ? 'selected' : ''} ${item.page === 'chat' ? 'ai-tab' : ''}`} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} onClick={() => go(item.page as Page)}><span className="tab-icon"><Icon name={item.icon}/></span><span>{item.label}</span>{item.page === 'care' && pendingHigh > 0 && <em>{pendingHigh}</em>}</button>)}</nav>}
      </SchoolGate>}
    </div>
    }
    <Sheet fullScreen title="我的约谈" open={invitationsOpen && session?.role === 'student'} onClose={() => setInvitationsOpen(false)}><div className="student-appointments-page"><StudentInvitations now={invitationNow} appointments={studentAppointments} teacherName={teacherName} onRespond={respondToInvitation}/></div></Sheet>
    <Sheet title="服务消息" open={inbox} onClose={() => setInbox(false)}>{session?.role === 'student' && <StudentNotices/>}{session?.role === 'teacher' ? <>{teacherRequests.some(r => r.status === '待联系') && <Alert type="info" title={`${teacherRequests.filter(r => r.status === '待联系').length} 条学生主动联系请求`} action={<Button onClick={() => { setInbox(false); go('workbench') }}>查看待办</Button>}/>}<Alert type="warning" title={`${pendingHigh} 条优先关注事项待复核`} description="仅展示已授权学生的必要摘要，无聊天原文。"/><Button type="primary" block className="spaced" onClick={() => { setInbox(false); go('care') }}>进入学生关怀</Button></> : null}</Sheet>
    <Sheet title="隐私与身份说明" open={showPrivacy} onClose={() => setShowPrivacy(false)}><p>校园墙的分享对其他同学可见，AI 对话不公开。正式心理支持服务将必要的分析摘要、趋势、预警与报告仅提供给授权心理教师，学生端不展示评估结果。教师与管理员都没有聊天原文入口。</p><Alert type="info" title="当前仅为前端演示" description="真实权限校验、传输及存储加密、风险分析、推送和留痕由后端实现。页面演示不代表这些服务已完成。"/><p className="subtle spaced">本次学生对话、非公开记录和收藏在退出时清空；公开帖子、举报和审核结果在本次访问中保留，供管理员处理。已授权的联系请求、虚构教师档案与系统操作日志在本次演示中保留，刷新后恢复样例。</p></Sheet>
    </CommerceContext.Provider>
    </AppearanceContext.Provider>
    </CampusOperationsProvider></CommunityProvider>
  </ConfigProvider>
}
export default App
