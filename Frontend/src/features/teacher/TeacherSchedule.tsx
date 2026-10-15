import { BookingButton } from './BookingButton'
import { useState } from 'react'
import { Button, Input, Modal, Select, Tag } from 'antd'
import type { CareCase, Session } from '../../types/domain'
import { Icon } from '../../components/shared/Shared'
import { Drawer } from '../../navigation/BackOverlays'
import { uid } from '../../data/data'
import { schoolDate, schoolToday } from './teacherData'
import type { Appointment } from './workspaceModel'
import { appointmentError, endTime, invitationLabel } from './workspaceModel'
import { StaffFormSteps } from '../../components/shared/StaffFormSteps'
import { PanelTitle } from './TeacherViews'

export type Booking = { appointment?: Appointment; caseId?: string }
const riskOrder: Record<CareCase['risk'], number> = { 高: 0, 中: 1, 低: 2 }
const riskColors: Record<CareCase['risk'], string> = { 高: 'red', 中: 'orange', 低: 'green' }
export function BookingDialog({ booking, items, appointments, session, onClose, onSave }: { booking: Booking; items: CareCase[]; appointments: Appointment[]; session: Session; onClose: () => void; onSave: (value: Appointment) => void }) {
  const [step,setStep] = useState(0)
  const original = booking.appointment
  const [caseId, setCaseId] = useState(original?.caseId || booking.caseId || '')
  const [day, setDay] = useState(original?.changeRequest?.day || original?.day || schoolDate(1))
  const [start, setStart] = useState(original?.changeRequest?.start || original?.start || '09:00')
  const [duration, setDuration] = useState(original?.duration || 45)
  const [method, setMethod] = useState(original?.method || '一对一面谈')
  const [location, setLocation] = useState(original?.location || '')
  const [error, setError] = useState('')
  const [modal, contextHolder] = Modal.useModal()
  const studentOptions = items
    .filter(item => item.teacherId === session.id && item.status === '跟进中' && !!item.review)
    .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])
    .map(item => ({ value: item.id, label: `${item.student} · ${item.studentId} · ${item.risk}风险`, name: `${item.student} · ${item.studentId}`, risk: item.risk, searchText: `${item.student} ${item.studentId}` }))
  const renderStudent = (option: typeof studentOptions[number]) => <span className="tw-booking-student-option"><span>{option.name}</span><Tag color={riskColors[option.risk]}>{option.risk}风险</Tag></span>
  const dirty = caseId !== (original?.caseId || booking.caseId || '') || day !== (original?.changeRequest?.day || original?.day || schoolDate(1)) || start !== (original?.changeRequest?.start || original?.start || '09:00') || duration !== (original?.duration || 45) || method !== (original?.method || '一对一面谈') || location !== (original?.location || '')
  const close = () => { if(step>0){setStep(value=>value-1);return} if (dirty) modal.confirm({ title: '放弃未保存的预约？', okText: '放弃修改', cancelText: '继续填写', onOk: onClose }); else onClose() }
  const save = () => {
    const candidate: Appointment = { id: original?.id || uid(), teacherId: session.id, caseId, day, start, duration, method, location: location.trim(), status: '已安排', studentAccountId: items.find(item => item.id === caseId)?.studentAccountId, responseStatus: '待确认' }
    if (!items.some(item => item.id === caseId && item.teacherId === session.id && item.status === '跟进中' && !!item.review)) { setError('请选择负责范围内已完成复核、正在跟进的学生。'); return }
    const reason = appointmentError(candidate, appointments)
    if (reason) { setError(reason); return }
    onSave(candidate)
  }
  const eligible = studentOptions.some(item=>item.value===caseId)
  const candidate: Appointment = {id:original?.id||'',teacherId:session.id,caseId,day,start,duration,method,location,status:'已安排'}
  const timeIssue = appointmentError({...candidate,location:location.trim()||'待填写'},appointments)
  const missing = !eligible?'请选择已经复核并接手的学生。':timeIssue || (!location.trim()?'请填写地点或联系安排。':'')
  const canNext = step===0?eligible:!timeIssue
  return <>{contextHolder}<Drawer zIndex={1200} rootClassName="teacher-overlay" className="tw-drawer tw-booking-drawer" placement="right" size="min(480px, 100vw)" title={original ? '调整并重新邀请' : '约谈学生'} open onClose={close} footer={<div className="tw-dialog-footer">{step>0?<Button onClick={()=>setStep(value=>value-1)}>上一步</Button>:<span>北京时间</span>}<Button type="primary" disabled={step===2?!!missing:!canNext} onClick={()=>step===2?save():setStep(value=>value+1)}>{step<2?'下一步':original?'确认改期并重新邀请':'发送约谈邀请'}</Button></div>}>
    <div className="tw-booking-form"><StaffFormSteps labels={['约谈对象','时间安排','沟通安排']} step={step}/>{original?.changeRequest && <div className="tw-booking-change"><b>学生申请改期</b><p>希望时间：{original.changeRequest.day} {original.changeRequest.start}</p><p>原因：{original.changeRequest.reason}</p></div>}<p className="tw-booking-intro">选择学生，安排约谈时间、沟通方式与地点。</p>
      <section className="tw-booking-group" hidden={step!==0}><h3>约谈对象</h3><label htmlFor="booking-student">学生</label><Select id="booking-student" aria-label="预约学生" placeholder="输入姓名或学号搜索" showSearch={{ filterOption: (input, option) => (option?.searchText || '').toLowerCase().replace(/\s/g, '').includes(input.trim().toLowerCase().replace(/\s/g, '')) }} notFoundContent="未找到匹配的学生" value={caseId || undefined} onChange={setCaseId} options={studentOptions} optionRender={option => renderStudent(option.data)} labelRender={value => { const option = studentOptions.find(item => item.value === value.value); return option ? renderStudent(option) : value.label }}/></section>
      <section className="tw-booking-group" hidden={step!==1}><h3>时间安排</h3><div className="tw-form-grid"><div><label htmlFor="booking-day">约谈日期</label><Input id="booking-day" type="date" min={schoolToday()} value={day} onChange={event => setDay(event.target.value)}/></div><div><label htmlFor="booking-start">开始时间</label><Input id="booking-start" type="time" value={start} onChange={event => setStart(event.target.value)}/></div></div><label htmlFor="booking-duration">约谈时长</label><Select id="booking-duration" aria-label="咨询时长" value={duration} onChange={setDuration} options={[30, 45, 60].map(value => ({ value, label: `${value} 分钟` }))}/></section>
      <section className="tw-booking-group" hidden={step!==2}><h3>沟通安排</h3><label htmlFor="booking-method">沟通方式</label><Select id="booking-method" aria-label="预约沟通方式" value={method} onChange={setMethod} options={['一对一面谈', '线上沟通', '电话联系', '跟进回访'].map(value => ({ value, label: value }))}/><label htmlFor="booking-location">地点或联系安排</label><Input id="booking-location" maxLength={120} value={location} onChange={event => setLocation(event.target.value)} placeholder="咨询室或约定的联系渠道"/></section>
      <p className="staff-required-hint" aria-live="polite">{step===0?eligible?'已选择学生，可继续安排时间。':'请先选择学生。':step===1?timeIssue||'时间安排已完整。':missing||'必填项已完整，可以发送邀请。'}</p>{error && <p className="teacher-error" role="alert">{error}</p>}<p className="tw-booking-note">学生确认后，约谈才视为已接受。</p>
    </div>
  </Drawer></>

}
export function Schedule({ appointments, items, onBook, onStatus, open }: { appointments: Appointment[]; items: CareCase[]; onBook: (value: Booking) => void; onStatus: (value: Appointment, status: Appointment['status']) => void; open: (item: CareCase, tab?: string) => void }) {
  const [day, setDay] = useState(schoolToday())
  const [filter, setFilter] = useState('全部')
  const [modal, contextHolder] = Modal.useModal()
  const visible = appointments.filter(item => item.day === day && (filter === '全部' || item.status === filter || (item.status === '已安排' && item.responseStatus === filter))).sort((a, b) => a.start.localeCompare(b.start))
  const change = (item: Appointment, status: Appointment['status']) => modal.confirm({ title: `确认标记为${status}？`, content: status === '已完成' ? '会谈完成后，请在学生档案中补充服务记录。' : '当前只更新演示日程状态，不会发送消息。', okText: '确认', cancelText: '返回', onOk: () => onStatus(item, status) })
  return <section className="tw-panel">{contextHolder}<PanelTitle title="我的咨询日程" description="时间按北京时间显示" action={<BookingButton onClick={() => onBook({})}/>}/><div className="tw-calendar-toolbar"><Input aria-label="日程日期" type="date" value={day} onChange={event => setDay(event.target.value)}/><Button onClick={() => setDay(schoolToday())}>今天</Button><Select aria-label="日程状态" value={filter} onChange={setFilter} options={['全部', '待确认', '已接受', '申请改期', '已婉拒', '已安排', '已完成', '未到访', '已取消'].map(value => ({ value, label: value === '全部' ? '全部状态' : value }))}/></div><div className="tw-week-strip">{Array.from({ length: 7 }, (_, i) => { const value = schoolDate(i); const count = appointments.filter(item => item.day === value && item.status === '已安排').length; return <button key={value} className={day === value ? 'active' : ''} onClick={() => setDay(value)}><small>{i === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(`${value}T12:00:00+08:00`))}</small><b>{value.slice(8)}</b><span>{count ? `${count} 场` : '空闲'}</span></button> })}</div><div className="tw-schedule-list">{visible.map(appointment => { const student = items.find(item => item.id === appointment.caseId); const hasRecord = student?.records.some(record => record.appointmentId === appointment.id); return <article key={appointment.id} className="tw-appointment"><div className="tw-appointment-time"><b>{appointment.start}</b><small>{endTime(appointment.start, appointment.duration)}</small></div><div className="tw-appointment-info"><div><h3>{student?.student || '授权学生'} · {appointment.method}</h3><Tag color={appointment.responseStatus === '申请改期' ? 'orange' : appointment.responseStatus === '已接受' ? 'green' : undefined}>{invitationLabel(appointment)}</Tag></div><p>{appointment.location}</p>{appointment.changeRequest && <p className="tw-change-request">希望改至 {appointment.changeRequest.day} {appointment.changeRequest.start} · {appointment.changeRequest.reason}</p>}{appointment.declineReason && <p className="tw-change-request">学生暂不参加：{appointment.declineReason}</p>}<small>{appointment.duration} 分钟 {appointment.status === '已完成' && !hasRecord ? '· 待补服务记录' : hasRecord ? '· 服务记录已保存' : ''}</small></div><div className="tw-appointment-actions">{appointment.status === '已安排' && <><Button size="small" onClick={() => onBook({ appointment })}>{appointment.responseStatus === '申请改期' ? '处理改期申请' : '改期'}</Button><Button size="small" disabled={!!appointment.responseStatus && appointment.responseStatus !== '已接受'} onClick={() => change(appointment, '已完成')}>完成</Button><Button type="text" size="small" onClick={() => change(appointment, '未到访')}>未到访</Button><Button type="text" size="small" onClick={() => change(appointment, '已取消')}>取消</Button></>}{student && <Button type="link" size="small" onClick={() => open(student, appointment.status === '已完成' ? '服务记录' : '状态概览')}>{appointment.status === '已完成' && !hasRecord ? '补充记录' : '学生档案'}</Button>}{['未到访', '已取消'].includes(appointment.status) && student?.status === '跟进中' && !!student.review && <BookingButton label="重新约谈学生" onClick={() => onBook({ caseId: appointment.caseId })}/>}</div></article> })}{!visible.length && <div className="tw-empty"><Icon name="guide"/><h3>这一天暂无匹配的安排</h3><p>安排一次咨询，或换一个日期查看。</p><BookingButton onClick={() => onBook({})}/></div>}</div></section>
}

