import { useState } from 'react'
import { Alert, Button, Input, Tag } from 'antd'
import type { Appointment } from '../teacher/workspaceModel'
import { endTime, invitationLabel } from '../teacher/workspaceModel'
import { schoolToday } from '../teacher/teacherData'
import './StudentInvitations.css'
import type { InvitationReply } from './invitationResponse'

export type { InvitationReply } from './invitationResponse'
type Props = { appointments: Appointment[]; now: number; teacherName: (id: string) => string; onRespond: (id: string, reply: InvitationReply) => string }

function InvitationCard({ item, now, teacherName, onRespond }: { item: Appointment } & Omit<Props, 'appointments'>) {
  const [editing, setEditing] = useState<'reschedule' | 'decline' | null>(null)
  const [day, setDay] = useState(item.day)
  const [start, setStart] = useState(item.start)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const expired = new Date(`${item.day}T${item.start}:00+08:00`).getTime() <= now
  const actionable = item.status === '已安排' && !expired && !['申请改期', '已婉拒'].includes(item.responseStatus || '')
  const respond = (reply: InvitationReply) => {
    const result = onRespond(item.id, reply)
    setError(result)
    if (!result) setEditing(null)
  }
  return <article className="student-invitation" data-invitation-id={item.id}>
    <header><b>{teacherName(item.teacherId)}的约谈邀请</b><Tag>{invitationLabel(item)}</Tag></header>
    {item.example && <p className="invitation-hint">示例邀请 · 可体验接受、改期或暂不参加</p>}
    <p>{item.day} · {item.start}–{endTime(item.start, item.duration)}（北京时间）</p>
    <p>{item.method} · {item.location}</p>
    {item.responseStatus === '已接受' && <p className="invitation-hint">你已接受邀请，请按约定时间参加。如时间有变，可申请改期。</p>}
    {item.declineReason && <p className="invitation-hint">你已告知老师暂不参加。<br/>原因：{item.declineReason}</p>}
    {item.changeRequest && <p className="invitation-hint">已申请改至 {item.changeRequest.day} {item.changeRequest.start}，等待老师确认。<br/>原因：{item.changeRequest.reason}</p>}
    {expired && item.status === '已安排' && <p className="invitation-hint">约定时间已到，请联系老师确认后续安排。</p>}
    {error && <Alert type="error" title={error} showIcon/>}
    {actionable && !editing && <div className="invitation-actions">
      {item.responseStatus !== '已接受' && <Button type="primary" onClick={() => respond({ status: '已接受' })}>接受邀请</Button>}
      <Button onClick={() => { setEditing('reschedule'); setReason(''); setError('') }}>申请改期</Button>
      {item.responseStatus !== '已接受' && <Button onClick={() => { setEditing('decline'); setReason(''); setError('') }}>暂不参加</Button>}
    </div>}
    {editing === 'reschedule' && actionable && <form onSubmit={event => { event.preventDefault(); respond({ status: '申请改期', changeRequest: { day, start, reason: reason.trim() } }) }}>
      <label>希望日期<Input aria-label="希望约谈日期" type="date" min={schoolToday()} value={day} onChange={event => setDay(event.target.value)}/></label>
      <label>希望时间<Input aria-label="希望约谈时间" type="time" value={start} onChange={event => setStart(event.target.value)}/></label>
      <label>改期原因<Input.TextArea aria-label="改期原因" maxLength={300} rows={2} value={reason} onChange={event => setReason(event.target.value)} placeholder="说明不方便的原因和希望的安排"/></label>
      <div className="invitation-actions"><Button type="primary" htmlType="submit">提交改期申请</Button><Button onClick={() => setEditing(null)}>取消填写</Button></div>
    </form>}
    {editing === 'decline' && actionable && <form onSubmit={event => { event.preventDefault(); respond({ status: '已婉拒', declineReason: reason }) }}><label>暂不参加的原因<Input.TextArea aria-label="暂不参加原因" value={reason} onChange={event => setReason(event.target.value)} rows={3} maxLength={300} placeholder="简单说明，方便老师了解你的情况"/></label><div className="invitation-actions"><Button type="primary" htmlType="submit">告知老师暂不参加</Button><Button onClick={() => setEditing(null)}>取消填写</Button></div></form>}
  </article>
}

export function StudentInvitations({ appointments, now, teacherName, onRespond }: Props) {
  const [filter, setFilter] = useState('全部')
  const [notice, setNotice] = useState('')
  const isUpcoming = (item: Appointment) => item.status === '已安排' && item.responseStatus !== '已婉拒' && new Date(`${item.day}T${item.start}:00+08:00`).getTime() > now
  const isPending = (item: Appointment) => isUpcoming(item) && item.responseStatus === '待确认'
  const visible = appointments.filter(item => filter === '全部' || (filter === '待回应' ? isPending(item) : filter === '待参加' ? isUpcoming(item) && item.responseStatus === '已接受' : !isUpcoming(item)))
  const respond: Props['onRespond'] = (id, reply) => {
    const error = onRespond(id, reply)
    if (!error) setNotice(reply.status === '已接受' ? '已接受约谈，老师可以看到你的回应。' : reply.status === '已婉拒' ? '已告知老师暂不参加。' : '改期申请已提交，等待老师确认并重新邀请。')
    return error
  }
  return <section className="student-invitations"><h2>约谈邀请</h2>
    <nav className="invitation-filters" aria-label="约谈筛选">{['全部', '待回应', '待参加', '历史'].map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}{value === '待回应' && appointments.some(isPending) ? ` ${appointments.filter(isPending).length}` : ''}</button>)}</nav>
    {notice && <Alert className="invitation-response-notice" type="success" role="status" title={notice} closable onClose={() => setNotice('')}/>}
    {visible.length ? [...visible].sort((a, b) => Number(isPending(b)) - Number(isPending(a)) || (filter === '历史' ? -1 : 1) * `${a.day} ${a.start}`.localeCompare(`${b.day} ${b.start}`)).map(item => <InvitationCard key={`${item.id}-${item.day}-${item.start}-${item.responseStatus}`} item={item} now={now} teacherName={teacherName} onRespond={respond}/>) : <p className="invitation-hint">{appointments.length ? '当前筛选下暂无约谈安排。' : '暂时没有约谈邀请，老师发出邀请后会显示在这里。'}</p>}
    <p className="invitation-hint">演示邀请和回应保留在当前浏览器，不发送真实推送；申请改期后需等待老师重新邀请。</p>
  </section>
}
