import { useState } from 'react'
import { Button, Image, Input, Modal, Select, Tag } from 'antd'
import { Drawer } from '../../navigation/BackOverlays'
import { useCampusOperations } from './CampusOperationsContext'
import type { CampusNotice, StudentFeedback } from './CampusOperationsContext'
import './CampusServiceViews.css'

export function AdminNotices() {
  const { notices, saveNotice } = useCampusOperations()
  const [selectedId,setSelectedId] = useState<string|null>(null)
  const selected = notices.find(item=>item.id===selectedId)
  const [draft, setDraft] = useState<{ id?: string; title: string; body: string } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('全部')
  const [modal, contextHolder] = Modal.useModal()
  const save = (status: CampusNotice['status']) => {
    if (!draft) return
    const result = saveNotice({ ...draft, status }); setError(result)
    if (!result) { setDraft(null); setNotice(status === '已发布' ? '通知已发布，学生可在服务消息中查看。' : '通知草稿已保存。') }
  }
  const close = () => {
    const original = notices.find(n => n.id === draft?.id)
    if (draft && (draft.title !== (original?.title || '') || draft.body !== (original?.body || ''))) modal.confirm({ title: '放弃未保存的通知？', okText: '放弃修改', cancelText: '继续编辑', onOk: () => setDraft(null) })
    else setDraft(null)
  }
  return <>{contextHolder}<section className="admin-panel campus-service-panel"><div className="admin-panel-heading"><h2>校园通知</h2><Button type="primary" onClick={() => { setError(''); setDraft({ title: '', body: '' }) }}>新建通知</Button></div><p>已发布通知显示在学生端的“服务消息”中。</p><Select aria-label="筛选通知状态" value={filter} onChange={setFilter} options={['全部', '草稿', '已发布'].map(value => ({ value, label: value }))}/>{notice && <p role="status">{notice}</p>}{notices.filter(n => filter === '全部' || n.status === filter).map(n => <article className="campus-service-item" key={n.id} role="button" tabIndex={0} aria-label={`查看通知：${n.title}`} onClick={()=>setSelectedId(n.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(n.id)}}}><Tag color={n.status === '已发布' ? 'green' : 'default'}>{n.status}</Tag><h3>{n.title}</h3><p className="campus-service-body">{n.body}</p><small>{n.time}</small><span className="staff-row-link">查看详情</span></article>)}{!notices.some(n => filter === '全部' || n.status === filter) && <div className="admin-empty"><b>暂无匹配的通知</b><p>新建通知，可先存草稿再发布。</p></div>}</section><Drawer rootClassName="staff-account-overlay" zIndex={1050} open={!!selected} title="校园通知详情" placement="right" size="min(480px, 100vw)" className="admin-service-editor" onClose={()=>setSelectedId(null)}>{selected&&<><Tag>{selected.status}</Tag><h2>{selected.title}</h2><small>{selected.time}</small><p className="campus-service-body">{selected.body}</p><div className="campus-service-actions"><Button type="primary" onClick={()=>{setError('');setDraft({id:selected.id,title:selected.title,body:selected.body})}}>编辑通知</Button>{selected.status==='已发布'&&<Button onClick={()=>modal.confirm({title:'撤回这条通知？',content:'撤回后学生端不再展示，内容保留为草稿。',okText:'确认撤回',cancelText:'取消',onOk:()=>{const result=saveNotice({...selected,status:'草稿'});setNotice(result||'通知已撤回。')}})}>撤回通知</Button>}</div></>}</Drawer><Drawer rootClassName="staff-account-overlay" zIndex={1150} open={!!draft} title="编辑校园通知" placement="right" size="min(480px, 100vw)" onClose={close} className="admin-service-editor" footer={<div className="campus-service-actions"><Button disabled={!draft?.title.trim()||!draft?.body.trim()} onClick={() => save('草稿')}>保存草稿</Button><Button type="primary" disabled={!draft?.title.trim()||!draft?.body.trim()} onClick={() => modal.confirm({title:'确认发布通知？',content:'发布后，同校学生可查看通知内容。',okText:'确认发布',cancelText:'继续编辑',onOk:()=>save('已发布')})}>发布通知</Button></div>}><p className="staff-required-hint" aria-live="polite">{!draft?.title.trim()?'请填写通知标题。':!draft?.body.trim()?'请填写通知正文。':'必填项已完整。'}</p><label htmlFor="campus-notice-title">通知标题</label><Input id="campus-notice-title" maxLength={60} value={draft?.title || ''} onChange={e => setDraft(prev => prev && { ...prev, title: e.target.value })}/><label htmlFor="campus-notice-body">通知正文</label><Input.TextArea id="campus-notice-body" rows={10} maxLength={2000} showCount value={draft?.body || ''} onChange={e => setDraft(prev => prev && { ...prev, body: e.target.value })}/>{error && <p role="alert" className="error-text">{error}</p>}</Drawer></>
}

export function AdminFeedback() {
  const { feedback, replyFeedback, completeFeedback } = useCampusOperations()
  const [modal, contextHolder] = Modal.useModal()
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const item = feedback.find(f => f.id === selectedId)
  const close = () => {
    if (item && reply !== item.reply) modal.confirm({ title: '放弃未保存的回复？', okText: '放弃修改', cancelText: '继续填写', onOk: () => setSelectedId(null) })
    else setSelectedId(null)
  }
  const complete = (feedback: StudentFeedback) => modal.confirm({
    title: '确认已处理并删除这条反馈？',
    content: '删除后，管理员列表和用户的“我的反馈”都不再显示这条记录。',
    okText: '已处理并删除', cancelText: '取消', okButtonProps: { danger: true },
    onOk: () => {
      const result = completeFeedback(feedback.id)
      if (result) { setNotice(result); return }
      if (selectedId === feedback.id) { setSelectedId(null); setReply(''); setError('') }
      setNotice('反馈已处理并删除。')
    },
  })
  const rows = feedback.filter(f => (filter === '全部' || f.status === filter) && `${f.text} ${f.studentName} ${f.studentId}`.toLowerCase().includes(search.trim().toLowerCase()))
  const update = (status: StudentFeedback['status']) => {
    if (!item) return
    const result = replyFeedback(item.id, reply, status); setError(result)
    if (!result) { setNotice(status === '已回复' ? '回复已保存，学生可在“我的反馈”中查看。' : '反馈已标记为处理中。'); if (status === '已回复') setSelectedId(null) }
  }
  return <>{contextHolder}<section className="admin-panel campus-service-panel"><div className="admin-panel-heading"><h2>校园反馈</h2><Tag>{feedback.filter(f => f.status === '待处理').length} 条待处理</Tag></div><Input aria-label="搜索校园反馈" placeholder="搜索学生账号或反馈内容" allowClear value={search} onChange={e => setSearch(e.target.value)}/><Select aria-label="筛选反馈状态" value={filter} onChange={setFilter} options={['全部', '待处理', '处理中', '已回复'].map(value => ({ value, label: value }))}/>{notice && <p role="status">{notice}</p>}{rows.map(f => <article className="campus-service-item" key={f.id} role="button" tabIndex={0} aria-label={`查看${f.studentName}反馈详情`} onClick={()=>{setSelectedId(f.id);setReply(f.reply);setError('')}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(f.id);setReply(f.reply);setError('')}}}><Tag color={f.status === '已回复' ? 'green' : 'blue'}>{f.status}</Tag>{f.example&&<Tag>示例</Tag>}<h3>{f.studentName} · {f.studentId}</h3><p className="campus-service-body">{f.text || '图片反馈'}</p><small>{f.time} · {f.images.length} 张图片</small><div className="campus-service-actions"><span className="staff-row-link">查看详情</span><Button danger onKeyDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();complete(f)}}>已处理</Button></div></article>)}{!rows.length && <div className="admin-empty"><b>暂无匹配的反馈</b><p>校园用户在“我的 → 帮助与反馈”提交的问题会显示在这里。</p></div>}</section><Drawer rootClassName="staff-account-overlay" open={!!item} title="处理校园反馈" placement="right" size="min(480px, 100vw)" className="admin-service-editor" onClose={close}>{item && <><Tag>{item.status}</Tag>{item.example&&<Tag>示例</Tag>}<h3>{item.studentName} · {item.studentId}</h3><p className="campus-service-body">{item.text}</p><Image.PreviewGroup>{item.images.map((src, i) => <Image key={i} src={src} width="100%" alt={`反馈图片 ${i + 1}`}/>)}</Image.PreviewGroup>{item.example&&<p className="staff-required-hint">这是一条演示反馈，可标记处理中或填写回复，体验完整处理流程。刷新后恢复示例。</p>}<label htmlFor="campus-feedback-reply">回复用户</label>{item.exampleReply&&item.status!=='已回复'&&<Button type="text" onClick={()=>setReply(item.exampleReply!)}>填入示例回复</Button>}<Input.TextArea id="campus-feedback-reply" value={reply} onChange={e => setReply(e.target.value)} rows={5} maxLength={1000}/>{error && <p role="alert" className="error-text">{error}</p>}<p className="staff-required-hint">{reply.trim()?'回复内容已填写。':'请填写回复内容后再提交。'}</p><div className="campus-service-actions">{item.status === '待处理' && <Button onClick={() => update('处理中')}>标记处理中</Button>}<Button type="primary" disabled={!reply.trim()} onClick={() => update('已回复')}>回复用户</Button><Button danger onClick={()=>complete(item)}>已处理</Button></div></>}</Drawer></>
}

export function StudentNotices() {
  const { notices } = useCampusOperations()
  const published = notices.filter(n => n.status === '已发布')
  return <section className="campus-student-notices"><h3>校园通知</h3>{published.length ? published.map(n => <article key={n.id}><h3>{n.title}</h3><small>{n.time}</small><p className="campus-service-body">{n.body}</p></article>) : <p>暂无新的校园通知。</p>}</section>
}
