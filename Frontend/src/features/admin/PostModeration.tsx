import { useState } from 'react'
import { Alert, Button, Image, Input, Modal, Select, Tag } from 'antd'
import { Drawer } from '../../navigation/BackOverlays'
import { Icon } from '../../components/shared/Shared'
import { useCommunity } from '../moderation/CommunityContext'
import { priorityReportCount } from '../moderation/moderationModel'
import './PostModeration.css'
export function PostModeration() {
  const { posts, deletedPosts, reports, decisions, review } = useCommunity()
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, contextHolder] = Modal.useModal()
  const pendingCount = (id: string) => reports.filter(r => r.postId === id && !r.resolved).length
  const pending = posts.filter(p => pendingCount(p.id) > 0)
  const high = pending.filter(p => pendingCount(p.id) >= priorityReportCount)
  const selected = [...posts, ...deletedPosts].find(p => p.id === selectedId)
  const isDeleted = deletedPosts.some(p => p.id === selectedId)
  const postReports = reports.filter(r => r.postId === selectedId)
  const postDecisions = decisions.filter(d => d.postId === selectedId)
  const list = (filter === 'deleted' ? deletedPosts : filter === 'pending' ? pending : filter === 'priority' ? high : posts).filter(p => `${p.title} ${p.author} ${p.id}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => pendingCount(b.id) - pendingCount(a.id))
  const close = () => { if (reason.trim()) modal.confirm({ title: '放弃未保存的审核说明？', okText: '放弃修改', cancelText: '继续填写', onOk: () => { setSelectedId(null); setReason(''); setError('') } }); else { setSelectedId(null); setError('') } }
  const decide = (action: '删除' | '保留') => {
    if (!selected) return
    if (!reason.trim()) { setError('请填写审核说明，说明违规依据或保留原因。'); return }
    modal.confirm({ title: action === '删除' ? '确认删除这条帖子？' : '确认保留这条帖子？', content: action === '删除' ? '帖子将从校园墙、热门推荐、搜索和地点社区移除；审核记录会保留。' : '现有举报将标记为已处理，帖子继续显示。', okText: action === '删除' ? '确认删除' : '确认保留', cancelText: '返回审核', okButtonProps: { danger: action === '删除' }, onOk: () => {
      const failure = review(selected.id, action, reason)
      if (failure) { setError(failure); return }
      setReason(''); setSelectedId(null); setNotice(action === '删除' ? '违规帖子已删除，校园墙已同步更新。' : '审核已完成，帖子保留，现有举报已处理。')
    } })
  }
  return <>{contextHolder}
    <div className="moderation-stats"><div><b>{pending.length}</b><span>待审核帖子</span></div><div><b>{high.length}</b><span>优先审核</span></div><div><b>{deletedPosts.length}</b><span>已删除</span></div></div>
    {notice && <Alert role="status" type="success" showIcon title={notice} closable afterClose={() => setNotice('')}/>}
    <section className="admin-panel moderation-panel"><div className="admin-toolbar"><Input aria-label="搜索审核帖子" prefix={<Icon name="search"/>} placeholder="搜索帖子、作者或编号" value={search} allowClear onChange={e => setSearch(e.target.value)}/><Select aria-label="筛选帖子审核状态" value={filter} onChange={setFilter} options={[{ value: 'pending', label: '待审核' }, { value: 'priority', label: `优先审核（≥${priorityReportCount} 次）` }, { value: 'all', label: '全部公开帖' }, { value: 'deleted', label: '已删除' }]}/></div><p className="admin-note">累计 {priorityReportCount} 个不同账号的未处理举报会优先显示。举报数量仅作为审核线索，删除需管理员确认。</p>
    <div className="moderation-list">{list.map(post => <button key={post.id} aria-label={`审核帖子：${post.title}`} onClick={() => { setSelectedId(post.id); setReason(''); setError('') }}><div className="moderation-item-top"><Tag color={filter === 'deleted' ? 'default' : pendingCount(post.id) >= priorityReportCount ? 'volcano' : pendingCount(post.id) ? 'gold' : 'default'}>{filter === 'deleted' ? '已删除' : pendingCount(post.id) >= priorityReportCount ? '优先审核' : pendingCount(post.id) ? '待审核' : '公开帖'}</Tag><span>{reports.filter(r => r.postId === post.id).length} 次举报</span></div><h3>{post.title}</h3><p>{post.text.slice(0, 90)}</p><small>{post.author} · {post.category}<Icon name="next"/></small></button>)}</div>
    {!list.length && <div className="admin-empty"><Icon name="shield"/><b>暂无匹配的帖子</b><p>{filter === 'pending' ? '学生提交举报后会出现在这里。也可查看全部公开帖，主动审核违规内容。' : '调整筛选条件后再查看。'}</p>{filter !== 'all' && <Button onClick={() => { setFilter('all'); setSearch('') }}>查看全部公开帖</Button>}</div>}
    </section>
    <Drawer rootClassName="staff-account-overlay" open={!!selected} onClose={close} title={isDeleted ? '已删除帖子记录' : '审核帖子'} placement="right" size="min(480px, 100vw)" className="admin-service-editor moderation-detail" footer={selected && !isDeleted ? <div className="campus-service-actions"><Button disabled={!reason.trim()} onClick={() => decide('保留')}>审核保留</Button><Button danger type="primary" disabled={!reason.trim()} onClick={() => decide('删除')}>删除违规帖</Button></div> : undefined} destroyOnHidden>{selected && <><Tag>{isDeleted ? '已删除' : '校园公开帖'}</Tag><h2>{selected.title}</h2><small>{selected.author} · {selected.category} · {selected.id}</small><p className="campus-service-body">{selected.text}</p><Image.PreviewGroup>{selected.images.map((src, i) => <Image key={i} src={src} width="100%" alt={`帖子图片 ${i + 1}`}/>)}</Image.PreviewGroup><section className="moderation-reports"><h3>举报情况 · {postReports.length} 次</h3>{!postReports.length && <p>暂无举报，管理员可根据公开内容主动审核。</p>}{Array.from(new Set(postReports.map(r => r.reason))).map(value => <div key={value}><span>{value}</span><b>{postReports.filter(r => r.reason === value).length} 次</b></div>)}<p>每个账号对同一帖子只计一次举报；此处不展示举报人身份。</p></section>{postDecisions.length > 0 && <section className="moderation-history"><h3>审核记录</h3>{postDecisions.map(d => <article key={d.id}><b>{d.action === '删除' ? '删除帖子' : '保留帖子'}</b><p>{d.reason}</p><small>{d.time} · {d.actorId}</small></article>)}</section>}{!isDeleted && <><label htmlFor="moderation-reason">审核说明</label><Input.TextArea id="moderation-reason" rows={4} maxLength={300} showCount value={reason} onChange={e => { setReason(e.target.value); setError('') }} placeholder="填写违规依据或保留原因"/>{error && <p role="alert" className="error-text">{error}</p>}</>}</>}</Drawer>
  </>
}
