import { useProductTheme } from '../../theme/productTheme'
import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Alert, Button, ConfigProvider, Input, Modal, Select, Tag } from 'antd'
import type { CareCase, Risk, Session } from '../../data/data'
import type { SupportRequest } from '../../data/hubData'
import { uid } from '../../data/data'
import { SectionTitle, Trend } from '../../components/shared/Shared'
import { Drawer } from '../../navigation/BackOverlays'
import { TeacherLayout } from './TeacherLayout'
import { Workbench, Roster } from './TeacherViews'
import { Triage, EscalationForm } from './TeacherTriage'
import { BookingDialog, Schedule } from './TeacherSchedule'
import type { Booking } from './TeacherSchedule'
import type { Appointment } from './workspaceModel'
import { TeacherHistory } from './TeacherHistory'
import { recordTemplates } from './recordTemplates'
import { StaffFormSteps } from '../../components/shared/StaffFormSteps'
import { TeacherSettings } from './TeacherSettings'
import { attentionNames, nextFollowUp, schoolToday, statusNames, teacherTimestamp as nowLabel } from './teacherData'
import './TeacherArea.css'
import './TeacherVisual.css'
import '../../theme/StaffRefinement.css'

export type TeacherPage = 'workbench' | 'triage' | 'care' | 'schedule' | 'profile'
type Props = { appointments: Appointment[]; setAppointments: Dispatch<SetStateAction<Appointment[]>>; requests: SupportRequest[]; acceptRequest: (id: string) => void; page: TeacherPage; go: (page: TeacherPage) => void; cases: CareCase[]; setCases: Dispatch<SetStateAction<CareCase[]>>; log: (action: string) => void; session: Session; logout: () => void }
const riskOrder: Record<Risk, number> = { 高: 0, 中: 1, 低: 2 }

export function TeacherArea({ page, go, cases, setCases, log, session, logout, requests, acceptRequest, appointments, setAppointments }: Props) {
  const productTheme = useProductTheme()
  const [status, setStatus] = useState('全部')
  const [risk, setRisk] = useState('全部')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recordStep,setRecordStep] = useState(0)
  const [templateChoice, setTemplateChoice] = useState('')
  const [historyVersion, setHistoryVersion] = useState(0)
  const [tab, setTab] = useState('状态概览')
  const [reviewNote, setReviewNote] = useState('')
  const [observationDate, setObservationDate] = useState('')
  const [method, setMethod] = useState('一对一面谈')
  const [summary, setSummary] = useState('')
  const [plan, setPlan] = useState('')
  const [date, setDate] = useState('')
  const [closureNote, setClosureNote] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [inbox, setInbox] = useState(false)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [response, setResponse] = useState('')
  const [recordAppointment, setRecordAppointment] = useState('')
  const [escalationReason, setEscalationReason] = useState('')
  const [reminders, setReminders] = useState({ priority: true, followUp: true })
  const [simulated, setSimulated] = useState(false)
  const [modal, contextHolder] = Modal.useModal()
  // Demonstration scoping only; production filtering must be enforced by the server.
  const own = cases.filter(item => item.teacherId === session.id)
  const selected = own.find(item => item.id === selectedId)
  const pending = own.filter(item => item.status === '待处理').sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])
  const following = own.filter(item => item.status === '跟进中')
  const ownAppointments = appointments.filter(item => item.teacherId === session.id && own.some(student => student.id === item.caseId))
  const due = following.filter(item => { const next = nextFollowUp(item); return next && next <= schoolToday() }).sort((a, b) => (nextFollowUp(a) || '').localeCompare(nextFollowUp(b) || ''))
  const dirty = !!(reviewNote.trim() || observationDate || summary.trim() || plan.trim() || date || closureNote.trim() || response.trim() || recordAppointment || escalationReason.trim())
  const recordMissing = [!summary.trim() && '沟通记录', !plan.trim() && '跟进计划', !date && '下次跟进日期', date && date < schoolToday() && '选择今天或以后的日期', /\[填写[^\]]*\]/.test(summary+plan) && '替换模板中的填写提示'].filter(Boolean)
  const recordNextReady = !!summary.trim() && !/\[填写[^\]]*\]/.test(summary)
  const clearDraft = () => { setRecordStep(0); setTemplateChoice(''); setReviewNote(''); setObservationDate(''); setSummary(''); setPlan(''); setDate(''); setClosureNote(''); setError(''); setToast(''); setMethod('一对一面谈'); setResponse(''); setRecordAppointment('') }
  const close = (after?: () => void) => {
    if (!after && tab === '服务记录' && recordStep > 0) { setRecordStep(0); return }
    const leave = () => { setSelectedId(null); clearDraft(); setEscalationReason(''); after?.() }
    if (dirty) { modal.confirm({ title: '放弃未保存的内容？', content: '已保存的服务记录会保留。', okText: '放弃修改', cancelText: '继续填写', onOk: leave }); return }
    leave()
  }
  const revealFeedback = () => requestAnimationFrame(() => { const feedback = document.getElementById('teacher-feedback'); feedback?.scrollIntoView({ block: 'start' }); feedback?.focus({ preventScroll: true }) })
  const fail = (message: string) => { setError(message); revealFeedback() }
  const announce = (message: string) => { setToast(message); revealFeedback() }
  const open = (item: CareCase, target = '状态概览') => { clearDraft(); setEscalationReason(''); setHistoryVersion(value => value + 1); setSelectedId(item.id); setTab(target); log(`查看授权个案 ${item.id} 摘要`) }
  const update = (item: CareCase, fields: Partial<CareCase>) => setCases(previous => previous.map(current => current.id === item.id && current.teacherId === session.id ? { ...current, ...fields } : current))
  const review = (needsFollowUp: boolean) => {
    if (!selected || selected.status !== '待处理') return
    if (!reviewNote.trim()) { fail('请填写复核说明，再确认处理结果。'); return }
    if (!needsFollowUp && (!/^\d{4}-\d{2}-\d{2}$/.test(observationDate) || observationDate < schoolToday())) { fail('请选择今天或以后的下次复核日期。'); return }
    update(selected, { status: '跟进中', review: { conclusion: needsFollowUp ? '需要跟进' : '继续观察', note: reviewNote.trim(), time: nowLabel() }, observation: needsFollowUp ? undefined : { note: reviewNote.trim(), nextDate: observationDate, time: nowLabel() }, closure: undefined })
    log(`复核授权个案 ${selected.id} · ${needsFollowUp ? '接手跟进' : '继续观察'}`)
    setReviewNote(''); setObservationDate(''); setError(''); announce(needsFollowUp ? '复核已完成，可以安排约谈或记录跟进。' : '已保存观察说明，到期将进入复核待办。')
    if (needsFollowUp) setTab('服务记录')
  }

  const applyTemplate = () => {
    const template = recordTemplates.find(value => value.id === templateChoice)
    if (!template || selected?.status !== '跟进中') return
    const apply = () => { setSummary(template.summary); setPlan(template.plan); setMethod(template.method); setError(''); setToast(''); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('#care-summary')?.focus()) }
    if (summary.trim() || plan.trim()) modal.confirm({ title: '替换当前记录内容？', content: '模板将替换沟通记录、跟进计划与沟通方式；学生反馈、关联咨询与日期保留。', okText: '替换内容', cancelText: '保留当前内容', onOk: apply })
    else apply()
  }
  const saveRecord = () => {
    if (!selected || selected.status !== '跟进中') return
    if (!summary.trim() || !plan.trim() || !date) { fail('请填写沟通记录、跟进计划和日期。'); return }
    if (/\[填写[^\]]*\]/.test(summary + plan)) { fail('请将模板中的填写提示替换为实际沟通内容，再保存。'); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < schoolToday()) { fail('请选择今天或以后的跟进日期。'); return }
    update(selected, { observation: undefined, records: [...selected.records, { id: uid(), date: nowLabel(), method, summary: summary.trim(), plan: plan.trim(), nextDate: date, response: response.trim() || undefined, appointmentId: recordAppointment || undefined }] })
    setResponse(''); setRecordAppointment(''); setTemplateChoice('')
    setRecordStep(0); log(`新增服务记录 ${selected.id}`); setSummary(''); setPlan(''); setDate(''); setError(''); announce('服务记录已保存，跟进安排已更新。')
  }
  const finish = () => {
    if (!selected || selected.status !== '跟进中') return
    if (!selected.records.length || !closureNote.trim()) { fail('请先保存服务记录，并填写结案说明。'); return }
    if (escalationReason.trim()) { fail('请先保存或清空尚未保存的升级说明。'); return }
    if (ownAppointments.some(item => item.caseId === selected.id && item.status === '已安排')) { fail('请先处理该学生尚未结束的咨询安排，再结案。'); return }
    if (summary.trim() || plan.trim() || date || response.trim() || recordAppointment) { fail('请先保存或清空尚未保存的服务记录。'); return }
    modal.confirm({ title: '确认本阶段结案？', content: '结案后记录保留为只读；如有新的支持需要，可重新跟进。', okText: '确认结案', cancelText: '继续跟进', onOk: () => { update(selected, { status: '已归档', closure: { note: closureNote.trim(), time: nowLabel() } }); log(`结案授权个案 ${selected.id}`); setClosureNote(''); setError(''); setToast('本阶段已结案。') } })
  }
  const simulate = () => {
    if (simulated) return
    const item: CareCase = { id: uid(), teacherId: session.id, student: '同学 E', studentId: 'S***091', group: '计算机专业 · 一年级', risk: '高', topic: '新状态变化，需要及时复核', time: nowLabel(), status: '待处理', source: '预警到达演示', summary: '虚构事件：近期状态发生变化，等待教师了解实际情况和支持需要。', signals: ['新状态变化待核实'], records: [] }
    setCases(previous => [item, ...previous]); setSimulated(true); log('接收模拟预警事件'); setToast('收到一条模拟预警，已加入待复核列表。')
  }
  const visible = own.filter(item => (status === '全部' || (status === '到期跟进' ? item.status === '跟进中' && !!nextFollowUp(item) && nextFollowUp(item)! <= schoolToday() : item.status === status)) && (risk === '全部' || item.risk === risk) && `${item.student}${item.studentId}${item.group}${item.topic}`.includes(search.trim())).sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])

  const saveAppointment = (value: Appointment) => {
    setAppointments(previous => previous.some(item => item.id === value.id) ? previous.map(item => item.id === value.id ? value : item) : [...previous, value])
    log(booking?.appointment ? '重新发送约谈邀请 ' + value.id : '发送约谈邀请 ' + value.id)
    setBooking(null); setToast('约谈邀请已保存，等待学生确认（演示）。'); if (!selected) go('schedule')
  }
  const navigate = (destination: 'triage' | 'care' | 'schedule', filter = '全部') => { setStatus(filter); setRisk('全部'); setSearch(''); go(destination) }
  return <ConfigProvider theme={productTheme}>
    <TeacherLayout page={page} go={go} session={session} pending={pending.length}>{contextHolder}
      {page === 'workbench' && <Workbench items={own} appointments={ownAppointments} open={open} navigate={navigate} book={() => setBooking({})} inbox={() => setInbox(true)}/>}
      {page === 'triage' && <Triage items={own} open={open} simulate={simulate} simulated={simulated}/>}
      {page === 'care' && <Roster items={visible} open={open} search={search} setSearch={setSearch} status={status} setStatus={setStatus} risk={risk} setRisk={setRisk} book={() => setBooking({})}/>}
      {page === 'schedule' && <Schedule appointments={ownAppointments} items={own} open={open} onBook={setBooking} onStatus={(item, nextStatus) => { setAppointments(previous => previous.map(value => value.id === item.id && value.teacherId === session.id ? { ...value, status: nextStatus } : value)); log('更新咨询状态 ' + item.id + ' ' + nextStatus) }}/>}
      {page === 'profile' && <TeacherSettings session={session} count={own.length} reminders={reminders} setReminders={setReminders} logout={logout}/>}
      {toast && !selected && <p role="status" className="tw-toast">{toast}</p>}
    </TeacherLayout>
    {booking && <BookingDialog booking={booking} items={own} appointments={ownAppointments} session={session} onClose={() => setBooking(null)} onSave={saveAppointment}/>}
    <Drawer rootClassName="teacher-overlay" className="tw-drawer" placement="right" size="min(480px, 100vw)" title="服务提醒" open={inbox} onClose={() => setInbox(false)}><section className="tw-notice-section"><h3>约谈改期申请</h3>{ownAppointments.filter(item => item.status === '已安排' && item.responseStatus === '申请改期').map(item => <button key={item.id} className="tw-task" onClick={() => { setInbox(false); setBooking({ appointment: item }) }}><span><b>{own.find(student => student.id === item.caseId)?.student} · 申请改期</b><small>{item.changeRequest?.day} {item.changeRequest?.start}</small></span></button>)}<h3>待复核预警 · {pending.length}</h3>{pending.map(item => <button className="tw-task" key={item.id} onClick={() => { setInbox(false); open(item) }}><span><b>{item.student} · {attentionNames[item.risk]}</b><small>{item.topic}</small></span></button>)}<h3>到期跟进 · {due.length}</h3>{due.map(item => <button className="tw-task" key={item.id} onClick={() => { setInbox(false); open(item, item.observation ? '状态概览' : '服务记录') }}><span><b>{item.student} · {item.observation ? '观察复核' : '跟进回访'}</b><small>{nextFollowUp(item)}</small></span></button>)}{requests.length > 0 && <><h3>授权联系请求</h3>{requests.map(item => <section key={item.id}><b>{item.studentName}</b><p>{item.topic}</p><Button disabled={item.status === '已受理'} onClick={() => { acceptRequest(item.id); log('受理联系请求 ' + item.id) }}>{item.status === '已受理' ? '已受理' : '受理请求'}</Button></section>)}</>}<p className="teacher-footnote">工作待办演示，不代表实时通知。</p></section></Drawer>
    <Drawer zIndex={1100} rootClassName="teacher-overlay" className="tw-drawer tw-case-drawer tw-native-detail" placement="right" size="min(480px, 100vw)" title="学生支持档案" open={!!selected} onClose={() => close()} destroyOnHidden>
      {selected && <div className="teacher-detail"><div className="teacher-detail-identity"><span className="avatar">{selected.student.slice(-1)}</span><div><h2>{selected.student}</h2><p>{selected.studentId} · {selected.group}</p></div></div><div className="teacher-detail-meta"><span className={`teacher-attention attention-${selected.risk}`}>{attentionNames[selected.risk]}</span><Tag>{statusNames[selected.status]}</Tag></div>
        <div className="tw-detail-actions"><Button type="primary" disabled={selected.status !== '跟进中' || !selected.review} onClick={() => close(() => setBooking({ caseId: selected.id }))}>约谈该学生</Button><Button onClick={() => close(() => go('schedule'))}>查看咨询日程</Button></div>
        <div className="teacher-status-tabs">{['状态概览', '服务记录'].map(value => <button key={value} className={tab === value ? 'selected' : ''} aria-pressed={tab === value} onClick={() => { setTab(value); setError('') }}>{value}</button>)}</div>
        <div id="teacher-feedback" tabIndex={-1} className="tw-detail-feedback">{error && <Alert type="error" showIcon title={error}/>} {toast && <Alert type="success" showIcon title={toast}/>}</div>
        {tab === '状态概览' && <>
          <SectionTitle title="发生了什么"/><section className="teacher-summary tw-event-summary"><h3>{selected.topic}</h3><p>{selected.summary || '暂无状态摘要，需通过沟通了解实际支持需要。'}</p><dl className="tw-event-meta"><div><dt>信息来源</dt><dd>{selected.source || '授权状态摘要 · 模拟'}</dd></div><div><dt>摘要时间</dt><dd>{selected.time} · 北京时间</dd></div></dl></section>
          <div className="tw-detail-provenance"><b>数据范围</b><span>授权状态摘要 · 当前教师负责 · 模拟数据</span></div><div className="tw-case-next"><span><small>下一步</small><b>{selected.status === '待处理' ? '核实摘要，填写教师复核结论' : selected.status === '跟进中' ? selected.observation ? '按观察计划复核学生状态' : selected.records.at(-1)?.nextDate ? '按跟进计划回访并保存服务记录' : '记录沟通，安排下一次跟进' : '本阶段服务已完成，记录保留'}</b></span>{selected.status !== '已归档' && <Button type="link" onClick={() => { const reviewing = selected.status === '待处理' || !!selected.observation; if (selected.observation) update(selected, { status: '待处理' }); const target = reviewing ? 'teacher-review-form' : 'teacher-record-form'; setTab(reviewing ? '状态概览' : '服务记录'); requestAnimationFrame(() => { document.getElementById(target)?.scrollIntoView({ block: 'start' }); document.querySelector<HTMLTextAreaElement>(reviewing ? '#review-note' : '#care-summary')?.focus({ preventScroll: true }) }) }}>{selected.status === '待处理' || selected.observation ? '去复核' : '写记录'}</Button>}</div><SectionTitle title="变化线索"/><div className="teacher-signals">{selected.signals?.map(signal => <Tag key={signal}>{signal}</Tag>) || <p className="subtle">暂无额外线索。</p>}</div>
          <SectionTitle title="近期状态变化" sub="模拟压力趋势 · 1–5，数值越高表示压力越高"/>{selected.trend?.length ? <Trend entries={selected.trend} metric="stress"/> : <p className="teacher-empty">暂无可展示的趋势数据。</p>}
          <p className="teacher-helper">AI 摘要用于辅助复核，请结合实际沟通判断学生的支持需要。</p>
          <EscalationForm key={selected.id} item={selected} reason={escalationReason} setReason={setEscalationReason} onEscalate={(reason, recipient) => { update(selected, { escalations: [...(selected.escalations || []), { id: uid(), reason, recipient, time: nowLabel(), acknowledged: false }] }); log('新增升级事项 ' + selected.id); announce('升级记录已保存，等待接收确认（演示）。') }} onAcknowledge={id => { update(selected, { escalations: selected.escalations?.map(event => event.id === id ? { ...event, acknowledged: true } : event) }); log('模拟确认升级接收 ' + selected.id) }}/>
          {selected.observation && <section className="teacher-review-result"><h3>继续观察 · 下次复核 {selected.observation.nextDate}</h3><p>{selected.observation.note}</p><Button onClick={() => { update(selected, { status: '待处理' }); setTab('状态概览'); setToast('请填写本次复核说明。') }}>再次复核</Button></section>}
          {selected.review && <section className="teacher-review-result"><h3>教师复核 · {selected.review.conclusion}</h3><p>{selected.review.note}</p><small>{selected.review.time}</small></section>}
          {selected.status === '待处理' && <form id="teacher-review-form" onSubmit={event => { event.preventDefault(); review(true) }}><SectionTitle title="复核处理"/><label className="field-label" htmlFor="review-note">复核 / 观察说明</label><Input.TextArea id="review-note" rows={3} maxLength={500} showCount placeholder="填写已核实的情况及处理理由" value={reviewNote} onChange={event => { setReviewNote(event.target.value); setToast(''); setError('') }}/><p className="staff-required-hint">{reviewNote.trim()?'复核说明已填写，可选择处理方式。':'请先填写复核说明。'}</p><Button type="primary" block htmlType="submit" className="spaced" disabled={!reviewNote.trim()}>确认需要跟进，接手处理</Button><label className="field-label" htmlFor="observation-date">下次复核日期（继续观察时必填）</label><Input id="observation-date" type="date" min={schoolToday()} value={observationDate} onChange={event => { setObservationDate(event.target.value); setError('') }}/><p className="staff-required-hint">{!observationDate?'继续观察需填写下次复核日期。':observationDate<schoolToday()?'复核日期不能早于今天。':'复核日期已填写。'}</p><Button block className="spaced" disabled={!reviewNote.trim()||!observationDate||observationDate<schoolToday()} onClick={() => review(false)}>继续观察，安排复核</Button></form>}
          {selected.status === '跟进中' && <Button type="primary" block className="spaced" onClick={() => setTab('服务记录')}>记录干预与跟进</Button>}
        </>}
        {tab === '服务记录' && <>
          <TeacherHistory key={historyVersion} item={selected} onShowEscalation={() => { setTab('状态概览'); requestAnimationFrame(() => document.getElementById('teacher-escalation')?.scrollIntoView({ block: 'start' })) }}/>
          {selected.status === '待处理' && <Alert type="info" title="请先完成状态复核" action={<Button onClick={() => setTab('状态概览')}>去复核</Button>}/>}
          {selected.status === '跟进中' && <>
            <form noValidate id="teacher-record-form" className="teacher-record-form" onSubmit={event => { event.preventDefault(); if(recordStep===0){if(recordNextReady)setRecordStep(1)}else saveRecord() }}><SectionTitle title="新增服务记录"/><StaffFormSteps labels={['沟通情况','跟进安排']} step={recordStep}/><fieldset hidden={recordStep!==0}><div className="tw-template-picker"><label className="field-label">记录模板（选填）</label><div><Select aria-label="记录模板" value={templateChoice || undefined} placeholder="选择模板，或直接填写" allowClear onChange={value => setTemplateChoice(value || '')} options={recordTemplates.map(value => ({ value: value.id, label: value.name }))}/><Button disabled={!templateChoice} onClick={applyTemplate}>填入模板</Button></div><p>仅提供填写结构，请依据实际沟通修改；模板不会自动保存。</p></div>{ownAppointments.some(item => item.caseId === selected.id && item.status === '已完成') && <><label className="field-label">关联已完成咨询</label><Select aria-label="关联咨询记录" value={recordAppointment || undefined} placeholder="可选择待补记录的会谈" allowClear onChange={value => setRecordAppointment(value || '')} options={ownAppointments.filter(item => item.caseId === selected.id && item.status === '已完成' && !selected.records.some(record => record.appointmentId === item.id)).map(item => ({ value: item.id, label: `${item.day} ${item.start} · ${item.method}` }))}/></>}<label className="field-label">沟通方式</label><Select aria-label="沟通方式" value={method} onChange={setMethod} options={['一对一面谈', '电话联系', '线上沟通', '跟进回访'].map(value => ({ value, label: value }))}/><label className="field-label" htmlFor="care-summary">沟通记录</label><Input.TextArea id="care-summary" value={summary} onChange={event => { setSummary(event.target.value); setToast(''); setError('') }} rows={3} maxLength={1000} placeholder="记录必要的沟通情况与支持措施，请勿复制聊天原文"/><label className="field-label" htmlFor="care-response">学生反馈（选填）</label><Input.TextArea id="care-response" rows={2} maxLength={500} value={response} onChange={event => { setResponse(event.target.value); setToast(''); setError('') }} placeholder="记录学生对本次支持的反馈"/></fieldset><fieldset hidden={recordStep!==1}><label className="field-label" htmlFor="care-plan">跟进计划</label><Input.TextArea id="care-plan" value={plan} onChange={event => { setPlan(event.target.value); setToast(''); setError('') }} rows={2} maxLength={500} placeholder="下一次需要了解什么、提供哪些支持"/><label className="field-label" htmlFor="care-date">下次跟进日期</label><Input id="care-date" type="date" min={schoolToday()} value={date} onChange={event => { setDate(event.target.value); setToast(''); setError('') }}/></fieldset><p className="tw-draft-hint">{summary || plan || date || response || recordAppointment ? '内容尚未保存 · 离开前请保存或放弃修改' : '填写本次沟通与后续支持安排'}</p><p className="staff-required-hint" aria-live="polite">{recordStep===0 ? recordNextReady?'沟通情况已填写，可继续安排跟进。':'请填写沟通记录，并替换模板中的填写提示。' : recordMissing.length?'还需完成：'+recordMissing.join('、'):'必填项已完整，可以保存。'}</p><div className="staff-step-actions">{recordStep===1 && <Button onClick={()=>setRecordStep(0)}>上一步</Button>}<Button type="primary" htmlType="submit" disabled={recordStep===0?!recordNextReady:recordMissing.length>0}>{recordStep===0?'下一步：跟进安排':'保存记录与跟进安排'}</Button></div></form>
            <details className="teacher-close-section"><summary>结束本阶段服务</summary><label className="field-label" htmlFor="closure-note">结案说明</label><Input.TextArea id="closure-note" rows={2} maxLength={500} placeholder="说明本阶段结束的依据与后续安排" value={closureNote} onChange={event => setClosureNote(event.target.value)}/><Button block className="spaced" onClick={finish}>确认结案</Button></details>
          </>}
        </>}
        {selected.status === '已归档' && <section className="teacher-review-result"><h3>本阶段已结案</h3><p>{selected.closure?.note || '本阶段服务已完成。'}</p><small>{selected.closure?.time}</small><Button block className="spaced" onClick={() => modal.confirm({ title: '重新开始跟进？', content: '原有记录保留，请为新的支持需要安排回访。', okText: '重新跟进', cancelText: '取消', onOk: () => { update(selected, { status: '跟进中', closure: undefined }); log(`重新跟进授权个案 ${selected.id}`); setTab('服务记录'); setToast('已重新进入跟进状态。') } })}>重新跟进</Button></section>}
        <p className="teacher-footnote">授权摘要样例 · 不含私人聊天原文</p>
      </div>}
    </Drawer>
  </ConfigProvider>
}
