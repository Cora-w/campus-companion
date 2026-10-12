import { useProductTheme } from '../../theme/productTheme'
import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Alert, Button, ConfigProvider, Input, Modal, Select, Tag } from 'antd'
import type { Account, Audit, Role, Session } from '../../data/data'
import { roleNames } from '../../data/data'
import { Icon } from '../../components/shared/Shared'
import { Drawer } from '../../navigation/BackOverlays'
import { ShopAuthorization } from './ShopAuthorization'
import { AdminNotices, AdminFeedback } from './CampusServiceViews'
import { useCommunity } from '../moderation/CommunityContext'
import { PostModeration } from './PostModeration'
import { StaffHelp } from '../../components/shared/StaffHelp'
import './AdminArea.css'
import '../../theme/StaffRefinement.css'

export type AdminPage = 'accounts' | 'shops' | 'announcements' | 'feedback' | 'profile'
type Props = { page: AdminPage; go: (page: AdminPage) => void; accounts: Account[]; setAccounts: Dispatch<SetStateAction<Account[]>>; audits: Audit[]; log: (action: string) => void; session: Session; logout: () => void }
const nav: { page: AdminPage; label: string; icon: string }[] = [
  { page: 'accounts', label: '账号管理', icon: 'users' }, { page: 'shops', label: '开店授权', icon: 'shield' }, { page: 'announcements', label: '校园通知', icon: 'bell' }, { page: 'feedback', label: '反馈处理', icon: 'chat' }, { page: 'profile', label: '我的', icon: 'profile' },
]
const titles: Record<AdminPage, string> = { accounts: '账号管理', shops: '开店授权', announcements: '校园通知', feedback: '反馈处理', profile: '我的' }
const roles = ['student', 'teacher', 'admin'] as const
function exportLogs(items: Audit[]) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(items, null, 2)], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = '心伙伴-操作记录.json'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function AdminArea({ page, go, accounts, setAccounts, audits, log, session, logout }: Props) {
  const productTheme = useProductTheme()
  const { reports: postReports, posts: publicPosts } = useCommunity()
  const pendingPostCount = new Set(postReports.filter(r => !r.resolved && publicPosts.some(p => p.id === r.postId)).map(r => r.postId)).size
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [actorFilter, setActorFilter] = useState('all')
  const [moderationOpen, setModerationOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string|null>(null)
  const selectedAccount = accounts.find(account=>account.id===selectedAccountId)
  const [editor, setEditor] = useState<{ id: string; name: string; role: Role } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, contextHolder] = Modal.useModal()

  const visible = accounts.filter(a => a.role !== 'merchant')
  const filtered = visible.filter(a => (roleFilter === 'all' || a.role === roleFilter) && (stateFilter === 'all' || a.enabled === (stateFilter === 'enabled')) && `${a.name} ${a.id}`.toLowerCase().includes(search.trim().toLowerCase()))
  const logs = audits.filter(a => `${a.actor} ${a.action}`.toLowerCase().includes(auditSearch.trim().toLowerCase()) && (actorFilter === 'all' || a.actor === actorFilter))
  const adminName = visible.find(a => a.id === session.id)?.name || session.name
  const closeEditor = () => {
    if (!editor) return
    const previous = visible.find(a => a.id === editor.id)
    if (previous && (previous.name !== editor.name || previous.role !== editor.role)) modal.confirm({ title: '放弃未保存的修改？', okText: '放弃修改', cancelText: '继续填写', onOk: () => setEditor(null) })
    else setEditor(null)
  }
  const save = () => {
    if (!editor) return
    const name = editor.name.trim()
    const current = visible.find(a => a.id === editor.id)
    if (!current) { setError('账号不存在。'); return }
    if (!name) { setError('请填写显示名。'); return }
    if (visible.some(a => a.id !== editor.id && a.name === name)) { setError('该显示名已存在，请换一个。'); return }
    if (current.id === session.id && editor.role !== current.role) { setError('不能修改当前登录账号的角色。'); return }
    if (current.name === name && current.role === editor.role) { setEditor(null); return }
    const commit = () => {
      setAccounts(prev => prev.map(a => a.id === current.id ? { ...a, name, role: editor.role, shopManagement: editor.role === 'student' ? a.shopManagement : false } : a))
      log(`更新账号 ${current.id}${current.role !== editor.role ? `，角色 ${roleNames[current.role]} → ${roleNames[editor.role]}` : '，修改显示名'}`)
      setEditor(null); setNotice('账号资料已更新。')
    }
    if (current.role !== editor.role) modal.confirm({ title: '确认变更账号角色？', content: `${current.id} 将变更为${roleNames[editor.role]}，再次登录将使用新角色。`, okText: '确认变更', cancelText: '取消', onOk: commit })
    else commit()
  }
  const toggle = (account: Account) => {
    if (account.id === session.id) return
    modal.confirm({ title: `${account.enabled ? '停用' : '启用'}这个账号？`, content: `${account.id}：${account.enabled ? '停用后将无法登录，关联的学生店铺也会停止接收新订单。' : '启用后可使用原有凭证登录。'}`, okText: account.enabled ? '确认停用' : '确认启用', cancelText: '取消', okButtonProps: { danger: account.enabled }, onOk: () => {
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, enabled: !a.enabled } : a))
      log(`${account.enabled ? '停用' : '启用'}账号 ${account.id}`); setNotice('账号状态已更新。')
    } })
  }
  const navigate = (target: AdminPage) => { setNotice(''); setRecordsOpen(false); go(target) }
  return <ConfigProvider theme={productTheme}><div className="admin-workspace">
    {contextHolder}
    <aside className="admin-sidebar"><nav aria-label="管理员主导航">{nav.map(item => <button key={item.page} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} className={page === item.page ? 'active' : ''} onClick={() => navigate(item.page)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav></aside>
    <div className="admin-main"><header className="admin-topbar"><div className="admin-topbar-title">{page!=='accounts'&&<button className="admin-page-back" aria-label="返回上一页" onClick={()=>window.campusBack?.()}><Icon name="back"/></button>}<span className="admin-brandmark"><Icon name="shield"/></span><b>心伙伴<span>管理中心</span></b></div><StaffHelp role="admin"/></header><main className="admin-content">
      <div className="admin-heading"><div><span className="admin-eyebrow">管理中心 / {titles[page]}</span><h1>{titles[page]}</h1><p>{page === 'accounts' ? '查找用户，调整身份与账号状态。' : page === 'shops' ? '指定学生授予开店权限，授权后学生可管理自己的店铺。' : page === 'announcements' ? '发布校园通知，管理已发布内容。' : page === 'feedback' ? '查看学生反馈，跟进并回复问题。' : '管理员资料与操作记录。'}</p></div></div>
      {notice && <Alert className="admin-feedback" role="status" type="success" showIcon title={notice} closable afterClose={() => setNotice('')}/>}
      {page === 'accounts' && <section className="admin-panel"><div className="admin-toolbar"><Input aria-label="搜索账号" prefix={<Icon name="search"/>} allowClear placeholder="搜索姓名或账号" value={search} onChange={e => setSearch(e.target.value)}/><Select aria-label="筛选账号角色" value={roleFilter} onChange={setRoleFilter} options={[{ value: 'all', label: '全部角色' }, ...roles.map(value => ({ value, label: roleNames[value] }))]}/><Select aria-label="筛选账号状态" value={stateFilter} onChange={setStateFilter} options={[{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]}/></div><div className="admin-list-caption">共 {filtered.length} 个账号<span>当前账号不可停用或变更角色</span></div><div className="admin-account-list">{filtered.map(account => <article key={account.id} data-account-id={account.id} role="button" tabIndex={0} aria-label={`查看${account.name}账号详情`} onClick={()=>setSelectedAccountId(account.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedAccountId(account.id)}}}><span className={`admin-avatar admin-avatar-${account.role}`}>{account.name.slice(0, 1)}</span><div className="admin-account-identity"><b>{account.name}{account.id === session.id && <small>当前账号</small>}</b><small>{account.id}</small></div><Tag color={account.role === 'teacher' ? 'cyan' : account.role === 'admin' ? 'blue' : 'default'}>{roleNames[account.role]}</Tag><div className="admin-account-status"><span className={'staff-account-state '+(account.enabled?'enabled':'disabled')}>{account.enabled?'已启用':'已停用'}</span><span className="staff-row-link">查看详情 ›</span></div></article>)}</div>{!filtered.length && <div className="admin-empty"><Icon name="users"/><b>没有匹配的账号</b><p>试试其他姓名、角色或状态。</p><Button onClick={() => { setSearch(''); setRoleFilter('all'); setStateFilter('all') }}>清除筛选</Button></div>}</section>}
      {page === 'shops' && <ShopAuthorization accounts={accounts} setAccounts={setAccounts} log={log}/>}
      {page === 'announcements' && <AdminNotices/>}
      {page === 'feedback' && <><button className="admin-moderation-entry" aria-label="帖子审核" onClick={() => setModerationOpen(true)}><Icon name="shield"/><div><b>帖子举报与违规审核{pendingPostCount > 0 && <Tag color="gold" style={{ marginLeft: 8 }}>{pendingPostCount} 条待审</Tag>}</b><small>处理被举报帖子，删除违规公开内容</small></div><Icon name="next"/></button><AdminFeedback/></>}
      {page === 'profile' && <><section className="admin-panel"><div className="admin-profile"><span className="admin-avatar admin-avatar-admin">{adminName.slice(0, 1)}</span><div><h2>{adminName}</h2><p>{session.id}</p><Tag color="blue">管理员</Tag></div></div><div className="admin-setting-row"><span>管理职责</span><b>账号、授权与校园服务</b></div><button aria-label="操作记录" className="admin-record-entry" onClick={() => setRecordsOpen(true)}><Icon name="report"/><div><b>操作记录</b><small>查看账号、授权与服务操作</small></div><Icon name="next"/></button></section><Button block className="admin-logout" onClick={() => modal.confirm({ title: '退出管理员账号？', okText: '退出登录', cancelText: '取消', onOk: logout })}>退出管理员账号</Button></>}
      <footer className="admin-footer"><span>心伙伴 · 校园管理中心</span><span>本地演示 · 刷新恢复样例</span></footer>
    </main></div>
    <Drawer rootClassName="staff-account-overlay" open={moderationOpen} onClose={() => setModerationOpen(false)} title="帖子审核" placement="right" size="min(480px, 100vw)" className="admin-service-editor" destroyOnHidden><PostModeration/></Drawer>
    <Drawer zIndex={1050} rootClassName="staff-account-overlay" className="admin-editor staff-account-detail" open={!!selectedAccount} title="账号详情" placement="right" size="min(480px, 100vw)" onClose={()=>setSelectedAccountId(null)} destroyOnHidden>{selectedAccount && <><h2>{selectedAccount.name}</h2><dl className="staff-detail-fields"><div><dt>账号</dt><dd>{selectedAccount.id}</dd></div><div><dt>身份</dt><dd>{roleNames[selectedAccount.role]}</dd></div><div><dt>状态</dt><dd>{selectedAccount.enabled?'已启用':'已停用'}</dd></div></dl><div className="staff-detail-actions"><Button type="primary" aria-label={`编辑${selectedAccount.name}`} onClick={()=>{setEditor({id:selectedAccount.id,name:selectedAccount.name,role:selectedAccount.role});setError('')}}>编辑资料</Button><Button disabled={selectedAccount.id===session.id} danger={selectedAccount.enabled} onClick={()=>toggle(selectedAccount)}>{selectedAccount.enabled?'停用账号':'启用账号'}</Button></div>{selectedAccount.id===session.id && <p className="admin-note">当前账号不可停用或变更角色。</p>}</>}</Drawer>
    <Drawer rootClassName="staff-account-overlay" zIndex={1150} open={!!editor} onClose={closeEditor} title="编辑账号" placement="right" size="min(480px, 100vw)" className="admin-editor" footer={<div className="admin-editor-actions"><Button onClick={closeEditor}>取消</Button><Button form="admin-account-form" htmlType="submit" type="primary" disabled={!editor?.name.trim() || visible.some(account=>account.id!==editor.id&&account.name===editor.name.trim())}>保存账号</Button></div>} destroyOnHidden><form id="admin-account-form" onSubmit={e => { e.preventDefault(); save() }}><p className="admin-note">{editor?.id}</p><label htmlFor="admin-account-name">显示名</label><Input id="admin-account-name" value={editor?.name || ''} maxLength={20} onChange={e => { setEditor(prev => prev && { ...prev, name: e.target.value }); setError('') }}/><p className="staff-required-hint" aria-live="polite">{!editor?.name.trim()?'请填写显示名。':visible.some(account=>account.id!==editor.id&&account.name===editor.name.trim())?'该显示名已存在，请换一个。':'显示名已填写。'}</p><label htmlFor="admin-account-role">身份角色</label><Select id="admin-account-role" aria-label="账号身份角色" value={editor?.role} disabled={editor?.id === session.id} onChange={role => setEditor(prev => prev && { ...prev, role })} options={roles.map(value => ({ value, label: roleNames[value] }))}/><p className="admin-note">身份变更影响下一次登录。变为非学生身份时，开店授权会被收回。</p>{error && <p role="alert" className="error-text">{error}</p>}</form></Drawer>
    <Drawer rootClassName="staff-account-overlay" open={recordsOpen} onClose={() => setRecordsOpen(false)} title="操作记录" placement="right" size="min(480px, 100vw)" className="admin-records" destroyOnHidden><div className="admin-toolbar"><Input aria-label="搜索操作日志" prefix={<Icon name="search"/>} allowClear placeholder="搜索操作、账号或店铺编号" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}/><Select aria-label="筛选日志操作者" value={actorFilter} onChange={setActorFilter} options={[{ value: 'all', label: '全部操作者' }, ...Array.from(new Set(audits.map(a => a.actor))).map(value => ({ value, label: value }))]}/><Button disabled={!logs.length} onClick={() => { exportLogs(logs); log(`导出操作日志 ${logs.length} 条`) }}>导出记录</Button></div><div className="admin-list-caption">共 {logs.length} 条记录<span>最近操作优先</span></div><div className="admin-log-list">{logs.map(a => <article key={a.id}><span className="admin-log-dot"><Icon name={a.action.includes('登录') ? 'profile' : 'edit'}/></span><div><b>{a.action}</b><small>{a.time} · {a.actor}</small></div></article>)}</div>{!logs.length && <div className="admin-empty"><Icon name="report"/><b>暂无匹配的记录</b><p>调整搜索条件后再查看。</p></div>}<p className="admin-note">记录保留在本次访问中，刷新后清空。</p></Drawer>
  </div></ConfigProvider>
}