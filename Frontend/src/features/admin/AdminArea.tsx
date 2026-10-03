import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Alert, Button, Input, Select, Switch, Tag } from 'antd'
import type { Account, Audit, Role, Session } from '../../data/data'
import { roleNames, uid } from '../../data/data'
import { DemoNote, Icon, SectionTitle, Sheet } from '../../components/shared/Shared'
export type AdminPage = 'accounts' | 'permissions' | 'audit' | 'profile'
type Props = { page: AdminPage; accounts: Account[]; setAccounts: Dispatch<SetStateAction<Account[]>>; audits: Audit[]; log: (action: string) => void; session: Session; logout: () => void }
export function AdminArea({ page, accounts, setAccounts, audits, log, session, logout }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('teacher')
  const [error, setError] = useState('')
  const [auditSearch, setAuditSearch] = useState('')
  const [changed, setChanged] = useState('')
  const add = () => {
    if (!name.trim()) { setError('请填写演示显示名。'); return }
    if (accounts.some(a => a.name === name.trim())) { setError('该显示名已存在，请换一个。'); return }
    const id = 'DEMO-' + uid().slice(0, 6).toUpperCase()
    setAccounts(prev => [...prev, { id, name: name.trim(), role, enabled: true }])
    log(`新增演示账号 ${id}，角色 ${roleNames[role]}`)
    setAdding(false); setName(''); setError(''); setChanged('演示账号已加入列表；未创建真实登录凭证。')
  }
  return <>
    {page === 'accounts' && <>
      <div className="page-heading"><span className="eyebrow">账号管理 · 最小必要权限</span><h1>让每种身份，各司其职</h1><p>维护账号与角色，不接触学生私人对话。</p></div>
      <div className="stats"><div><b>{accounts.length}</b><span>演示账号</span></div><div><b>{accounts.filter(a => a.enabled).length}</b><span>已启用</span></div><div><b>4</b><span>身份角色</span></div></div>
      <Input aria-label="搜索账号" placeholder="搜索显示名或演示账号" value={search} onChange={e => setSearch(e.target.value)}/>
      <div className="pills wide spaced">{['全部', 'student', 'merchant', 'teacher', 'admin'].map(r => <button key={r} className={filter === r ? 'selected' : ''} onClick={() => setFilter(r)}>{r === '全部' ? r : roleNames[r as Role]}</button>)}</div>
      <Button type="primary" block onClick={() => { setAdding(true); setError('') }}>＋ 新增演示账号</Button>
      {changed && <p role="status" className="success-note">{changed}</p>}
      <div className="account-list">{accounts.filter(a => (filter === '全部' || a.role === filter) && (a.name + a.id).includes(search)).map(account => <article className="surface" key={account.id}><div className="row"><div><h3>{account.name}</h3><p className="subtle">{account.id}</p></div><Switch aria-label={`启用${account.name}`} checked={account.enabled} disabled={account.id === session.id} onChange={checked => { setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, enabled: checked } : a)); log(`${checked ? '启用' : '停用'}账号 ${account.id}`); setChanged('账号状态已在演示中更新。') }}/></div><div className="row"><Tag color={account.role === 'teacher' ? 'green' : 'default'}>{roleNames[account.role]}</Tag><small>{account.id === session.id ? '当前账号，不可停用' : account.enabled ? '已启用' : '已停用'}</small></div></article>)}</div>
      {!accounts.some(a => (filter === '全部' || a.role === filter) && (a.name + a.id).includes(search)) && <p className="empty">没有匹配的账号。</p>}
    </>}
    {page === 'permissions' && <>
      <div className="page-heading"><h1>角色与数据边界</h1><p>权限分级，保护服务中的敏感信息。</p></div>
      {[['merchant', '校园商家', ['仅管理绑定店铺资料和商品', '查看本店订单与配送信息', '管理本店推广，不访问学生私人数据']], ['student', '学生本人', ['校园墙分享、评论与收藏', '校园服务发现与私人 AI 对话', '联系心理老师；不展示评估结果']], ['teacher', '授权心理教师', ['授权学生的状态趋势与预警摘要', '必要的评估摘要', '干预、跟进与档案']], ['admin', '平台管理员', ['账号启用/停用', '角色配置与账号登记', '不含敏感正文的操作日志']]].map(([key, title, items]) => <section className="surface permission-card" key={key as string}><div className="row"><h3>{title}</h3><Icon name={key === 'student' ? 'profile' : key === 'teacher' ? 'shield' : 'users'}/></div><ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul></section>)}
      <Alert type="warning" showIcon title="管理员无权查看聊天原文" description="管理员也不提供个人辅导档案入口。真实鉴权、数据过滤、传输及存储加密必须由后端实现；前端页面隔离不等同于安全权限。"/>
    </>}
    {page === 'audit' && <>
      <div className="page-heading"><h1>操作留痕</h1><p>记录谁做了什么，不记录学生说了什么。</p></div><Input aria-label="搜索操作日志" placeholder="搜索操作者或操作类型" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}/><SectionTitle title="本次演示日志" sub="只含操作时间、角色与对象编号"/><div className="audit-list">{audits.filter(a => (a.actor + a.action).includes(auditSearch)).map(a => <article key={a.id}><span className="audit-dot"/><div><b>{a.action}</b><small>{a.time} · {a.actor}</small></div></article>)}</div>{!audits.some(a => (a.actor + a.action).includes(auditSearch)) && <p className="empty">没有匹配的日志。</p>}<DemoNote>当前日志是内存中的演示记录；正式留痕需服务端可靠记录与访问控制。</DemoNote>
    </>}
    {page === 'profile' && <><section className="profile-banner"><span className="avatar">管</span><div><h1>{session.name}</h1><p>{session.id}</p><Tag>平台管理员 · 演示</Tag></div></section><section className="surface spaced"><h3>职责边界</h3><p>维护服务账号和角色，查看不含私人正文的操作记录。无学生对话、个人报告与辅导内容的查阅入口。</p></section><Button block className="spaced" onClick={logout}>退出当前身份</Button></>}
    <Sheet open={adding} onClose={() => setAdding(false)} title="新增演示账号"><form onSubmit={e => { e.preventDefault(); add() }}><label className="field-label" htmlFor="account-name">显示名</label><Input id="account-name" value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="使用虚构名称"/><label className="field-label">角色</label><Select aria-label="新增账号角色" value={role} onChange={setRole} options={Object.entries(roleNames).map(([value, label]) => ({ value, label }))}/><p className="subtle spaced">只登记演示账号，不设置或保存密码，不创建真实登录权限。</p>{error && <p role="alert" className="error-text">{error}</p>}<Button type="primary" block htmlType="submit" className="spaced">保存演示账号</Button></form></Sheet>
  </>
}

