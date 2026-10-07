import { SchoolGate } from './features/auth/SchoolGate'
import { useBackNavigation } from './navigation/useBackNavigation'
import { installViewportTracking } from './layout/viewport'
import { authService } from './services/auth'
import { AppearanceContext, appearanceKey, readTheme, themes } from './theme/appearance'
import type { ThemeId } from './theme/appearance'
import './theme/appearance.css'
import { CommerceContext, merchantShopIds } from './features/commerce/commerce'
import { useCommerceStore } from './features/commerce/useCommerceStore'
import type { MerchantPage } from './features/commerce/MerchantArea'
const MerchantArea = lazy(() => import('./features/commerce/MerchantArea').then(m => ({ default:m.MerchantArea })))
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, ConfigProvider, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import type { Account, Audit, CareCase, Session } from './data/data'
import { initialAccounts, initialCases, nowLabel, roleNames, uid } from './data/data'
import { Icon, Sheet } from './components/shared/Shared'
const StudentArea = lazy(() => import('./features/student/StudentArea').then(module => ({ default: module.StudentArea })))
import type { StudentPage } from './features/student/StudentArea'
const TeacherArea = lazy(() => import('./features/teacher/TeacherArea').then(module => ({ default: module.TeacherArea })))
import type { TeacherPage } from './features/teacher/TeacherArea'
const AdminArea = lazy(() => import('./features/admin/AdminArea').then(module => ({ default: module.AdminArea })))
import type { AdminPage } from './features/admin/AdminArea'
import type { SupportRequest } from './data/hubData'
import './App.css'
import { LoginPage } from './features/auth/LoginPage'

type Page = StudentPage | TeacherPage | AdminPage | MerchantPage
const studentNav = [{ page: 'home', label: '首页', icon: 'home' }, { page: 'services', label: '发现', icon: 'location' }, { page: 'publish', label: '发布', icon: 'plus' }, { page: 'chat', label: '消息', icon: 'chat' }, { page: 'profile', label: '我的', icon: 'profile' }]
const teacherNav = [{ page: 'workbench', label: '工作台', icon: 'home' }, { page: 'alerts', label: '预警', icon: 'bell' }, { page: 'archives', label: '档案', icon: 'report' }, { page: 'overview', label: '概览', icon: 'trend' }, { page: 'profile', label: '我的', icon: 'profile' }]
const adminNav = [{ page: 'accounts', label: '账号', icon: 'users' }, { page: 'permissions', label: '权限', icon: 'shield' }, { page: 'audit', label: '日志', icon: 'report' }, { page: 'profile', label: '我的', icon: 'profile' }]
const merchantNav = [{page:'merchant-home',label:'经营',icon:'home'},{page:'merchant-products',label:'商品',icon:'food'},{page:'merchant-orders',label:'订单',icon:'report'},{page:'merchant-promotion',label:'推广',icon:'trend'},{page:'profile',label:'我的',icon:'profile'}]
const pageTitles: Record<Page, string> = { 'merchant-home':'商家工作台', 'merchant-products':'商品管理', 'merchant-orders':'订单管理', 'merchant-promotion':'推广管理', home: '心伙伴', services: '校园发现', publish: '发布动态', chat: '消息', profile: '我的', workbench: '心理教师工作台', alerts: '预警中心', archives: '干预档案', overview: '阶段概览', accounts: '账号管理', permissions: '角色权限', audit: '操作日志' }

function App() {
  const [themeId, setThemeId] = useState(readTheme)
  const [themeSaved, setThemeSaved] = useState(true)
  const palette = themes.find(theme => theme.id === themeId) || themes[0]
  const chooseTheme = (id: ThemeId) => {
    setThemeId(id)
    try { localStorage.setItem(appearanceKey, id); setThemeSaved(true) } catch { setThemeSaved(false) }
  }
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = palette.id
    root.style.setProperty('--accent', palette.accent)
    root.style.setProperty('--accent-soft', palette.soft)
    root.style.setProperty('--canvas', palette.canvas)
    root.style.setProperty('--theme-tint', palette.tint)
  }, [palette])
  const [promotion,setPromotion] = useState({enabled:true,title:'下课了，来点零食。'})
  const [restoring, setRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [session, setSession] = useState<Session | null>(null)
  const { shops, setShops, orders:shopOrders, placeOrder, changeOrderStatus } = useCommerceStore(session)
  const [page, setPage] = useState<Page>('home')
  const [pageTrail, setPageTrail] = useState<{page:Page;scroll:number}[]>([])
  useBackNavigation(!!session && pageTrail.length > 0, () => {
    const previous = pageTrail.at(-1)
    if (!previous) return
    setPageTrail(prev => prev.slice(0,-1)); setPage(previous.page)
    requestAnimationFrame(() => window.scrollTo(0,previous.scroll))
  },0)
  useEffect(() => {
    let active = true
    authService.restore().then(user => {
      if (!active) return
      setSession(user); setPageTrail([])
      if (user) setPage(user.role === 'student' ? 'home' : user.role === 'teacher' ? 'workbench' : user.role === 'merchant' ? 'merchant-home' : 'accounts')
      setRestoreError(''); setRestoring(false)
    }).catch(error => { if (active) { setRestoreError(error instanceof Error ? error.message : '暂时无法恢复登录'); setRestoring(false) } })
    return () => { active = false }
  },[restoreAttempt])
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const requestSupport = (topic: string) => {
    if (session?.role !== 'student') return
    setRequests(prev => prev.some(r => r.studentId === session.id && r.status === '待联系') ? prev : [{ id: uid(), studentId: session.id, studentName: session.name, topic, time: nowLabel(), status: '待联系' }, ...prev])
  }
  const [cases, setCases] = useState<CareCase[]>(initialCases)
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [audits, setAudits] = useState<Audit[]>([])
  const [inbox, setInbox] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  useEffect(installViewportTracking, [])
  const log = (action: string, actor = session ? `${roleNames[session.role]} · ${session.id}` : '演示访客') => setAudits(prev => [{ id: uid(), time: nowLabel(), actor, action }, ...prev])
  const go = (target: Page) => { if (target === page) return; setPageTrail(prev => [...prev,{page,scroll:window.scrollY}]); setPage(target); window.scrollTo(0, 0) }
  const login = (next: Session) => {
    setPageTrail([]); setSession(next); setPage(next.role === 'student' ? 'home' : next.role === 'teacher' ? 'workbench' : next.role === 'merchant' ? 'merchant-home' : 'accounts')
    log('账号登录演示', roleNames[next.role] + ' · ' + next.id)
  }
  const logout = async () => {
    try { await authService.logout() }
    catch { void message.error('服务端退出未确认，已清除本机登录状态。') }
    finally { log('退出登录'); setSession(null); setPageTrail([]); setInbox(false); window.scrollTo(0, 0) }
  }
  const isChat = false
  const nav = session?.role === 'merchant' ? merchantNav : session?.role === 'teacher' ? teacherNav : session?.role === 'admin' ? adminNav : studentNav
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
  const merchantPending = shopOrders.filter(o=>o.shopId===merchantShopIds[session?.id || ''] && o.status==='待接单').length
  const pendingHigh = cases.filter(c => c.risk === '高' && c.status === '待处理').length
  return <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: palette.accent, colorInfo: palette.accent, colorSuccess: '#248a3d', colorWarning: '#996000', colorError: '#c9342b', borderRadius: 12, controlHeight: 44, fontSize: 14, colorText: '#242321', colorTextSecondary: '#66635f', colorTextPlaceholder: '#77716a', colorBgContainer: '#ffffff', colorBgLayout: palette.canvas, colorBorder: palette.tint, fontFamily: 'inherit' }, components: { Button: { primaryShadow: 'none' }, Drawer: { footerPaddingBlock: 16 }, Input: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, InputNumber: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, DatePicker: { activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeShadow: 'none' }, Select: { optionSelectedBg: palette.soft, activeBorderColor: palette.tint, hoverBorderColor: palette.tint, activeOutlineColor: 'transparent' } } }}>
    <AppearanceContext.Provider value={{ themeId, choose: chooseTheme, saved: themeSaved }}>
    <CommerceContext.Provider value={{shops,setShops,orders:shopOrders,placeOrder,changeOrderStatus,promotion,setPromotion,studentId:session?.role==='student'?session.id:''}}>
    <div className={`app-shell ${!session ? 'login-shell' : ''} ${isChat ? 'chatting' : ''}`}>
      {restoring ? <p className="loading-page" role="status">正在恢复登录…</p> : restoreError ? <div className="loading-page"><p role="alert">{restoreError}</p><Button onClick={() => { setRestoring(true); setRestoreAttempt(n => n+1) }}>重试恢复登录</Button></div> : !session ? <LoginPage onLogin={login} onPrivacy={() => setShowPrivacy(true)}/> : <SchoolGate key={session.id} session={session} logout={logout}>
        <header className="mobile-header">{page === 'home' ? <div className="mobile-brand"><b>心伙伴</b><span>你的校园生活</span></div> : <div className="header-title">{isChat && <button className="icon-button" aria-label="返回校园墙" onClick={() => go('home')}><Icon name="back"/></button>}<h1>{pageTitles[page]}</h1></div>}<button className="icon-button notification" aria-label="服务消息" onClick={() => setInbox(true)}><Icon name="bell"/>{session.role==='merchant' && merchantPending>0 && <i>{merchantPending}</i>}{session.role === 'teacher' && pendingHigh + requests.filter(r => r.status === '待联系').length > 0 && <i>{pendingHigh + requests.filter(r => r.status === '待联系').length}</i>}</button></header>
        <div className="main-shell page-switch-shell"><main ref={pageSurface}><Suspense fallback={<p className="loading-page" role="status">正在准备你的空间…</p>}>
          {session.role === 'merchant' && <MerchantArea page={page as MerchantPage} session={session} logout={logout} go={go}/>}
          {session.role === 'student' && <StudentArea page={page as StudentPage} go={go} session={session} logout={logout} requests={requests} requestSupport={requestSupport}/>}
          {session.role === 'teacher' && <TeacherArea page={page as TeacherPage} go={go} session={session} logout={logout} cases={cases} setCases={setCases} log={log} requests={requests} acceptRequest={id => setRequests(prev => prev.map(r => r.id === id ? { ...r, status: '已受理' } : r))}/>}
          {session.role === 'admin' && <AdminArea page={page as AdminPage} accounts={accounts} setAccounts={setAccounts} audits={audits} log={log} session={session} logout={logout}/>}
          </Suspense>{!isChat && <footer>心伙伴 · 发现校园，分享生活<small>手机端交互原型 · 全部数据为演示</small></footer>}
        </main></div>
        {!isChat && <nav className="bottom-nav" aria-label="底部导航" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>{nav.map(item => <button key={item.page} className={`${page === item.page ? 'selected' : ''} ${item.page === 'chat' ? 'ai-tab' : ''}`} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} onClick={() => go(item.page as Page)}><span className="tab-icon"><Icon name={item.icon}/></span><span>{item.label}</span>{item.page === 'alerts' && pendingHigh > 0 && <em>{pendingHigh}</em>}</button>)}</nav>}
      </SchoolGate>}
    </div>
    <Sheet title="服务消息" open={inbox} onClose={() => setInbox(false)}>{session?.role === 'merchant' ? <><Alert type="info" title={`${merchantPending} 条本店演示订单待接单`}/><Button type="primary" block className="spaced" onClick={()=>{setInbox(false);go('merchant-orders')}}>查看店铺订单</Button></> : session?.role === 'teacher' ? <>{requests.some(r => r.status === '待联系') && <Alert type="info" title={`${requests.filter(r => r.status === '待联系').length} 条学生主动联系请求`} action={<Button onClick={() => { setInbox(false); go('workbench') }}>查看待办</Button>}/>}<Alert type="warning" title={`${pendingHigh} 条高风险样例待复核`} description="仅展示已授权学生的必要摘要，无聊天原文。"/><Button type="primary" block className="spaced" onClick={() => { setInbox(false); go('alerts') }}>进入预警中心</Button></> : <><Alert type="info" title="暂时没有新消息" description="正式服务通知将在接入后展示。当前不向任何人推送消息。"/></>}</Sheet>
    <Sheet title="隐私与身份说明" open={showPrivacy} onClose={() => setShowPrivacy(false)}><p>校园墙的分享对其他同学可见，AI 对话不公开。正式心理支持服务将必要的分析摘要、趋势、预警与报告仅提供给授权心理教师，学生端不展示评估结果。教师与管理员都没有聊天原文入口。</p><Alert type="info" title="当前仅为前端演示" description="真实权限校验、传输及存储加密、风险分析、推送和留痕由后端实现。页面演示不代表这些服务已完成。"/><p className="subtle spaced">本次学生对话、发布和收藏在退出时清空。已授权的联系请求、虚构教师档案与系统操作日志在本次演示中保留，刷新后恢复样例。</p></Sheet>
    </CommerceContext.Provider>
    </AppearanceContext.Provider>
  </ConfigProvider>
}
export default App
