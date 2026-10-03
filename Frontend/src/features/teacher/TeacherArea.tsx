import type { SupportRequest } from '../../data/hubData'
import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Alert, Button, Checkbox, Input, Progress, Select, Tag } from 'antd'
import type { CareCase, Risk, Session } from '../../data/data'
import { initialMoods, nowLabel, uid } from '../../data/data'
import { DemoNote, Icon, RiskTag, SectionTitle, Sheet, Trend } from '../../components/shared/Shared'
export type TeacherPage = 'workbench' | 'alerts' | 'archives' | 'overview' | 'profile'
type Props = { requests: SupportRequest[]; acceptRequest: (id: string) => void; page: TeacherPage; go: (page: TeacherPage) => void; cases: CareCase[]; setCases: Dispatch<SetStateAction<CareCase[]>>; log: (action: string) => void; session: Session; logout: () => void }
export function TeacherArea({ page, go, cases, setCases, log, session, logout, requests, acceptRequest }: Props) {
  const [riskFilter, setRiskFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部状态')
  const [archiveFilter, setArchiveFilter] = useState('全部状态')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('概览')
  const [method, setMethod] = useState('一对一面谈')
  const [summary, setSummary] = useState('')
  const [plan, setPlan] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [recordError, setRecordError] = useState('')
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [simulationSent, setSimulationSent] = useState(false)
  const [toast, setToast] = useState('')
  const selected = cases.find(c => c.id === selectedId)
  const active = cases.filter(c => c.status !== '已归档')
  const pending = cases.filter(c => c.status === '待处理')
  const open = (item: CareCase) => { setSelectedId(item.id); setDetailTab('概览'); setSummary(''); setPlan(''); setNextDate(''); setRecordError(''); setArchiveConfirm(false); setToast(''); log(`查看授权个案 ${item.id} 摘要`) }
  const updateCase = (id: string, update: Partial<CareCase>) => setCases(prev => prev.map(c => c.id === id ? { ...c, ...update } : c))
  const simulate = () => {
    if (simulationSent) return
    setCases(prev => [{ id: 'CASE-DEMO-PUSH', student: '同学 D', studentId: 'S***078', group: '计算机专业 · 二年级', risk: '高', topic: '新状态摘要待专业复核', time: nowLabel(), status: '待处理', records: [] }, ...prev])
    setSimulationSent(true); setToast('收到一条高风险预警样例，已加入待处理列表。未发生真实推送。'); log('触发高风险预警演示事件')
  }
  const saveRecord = () => {
    if (!selected) return
    if (!summary.trim() || !plan.trim() || !nextDate) { setRecordError('请填写过程记录、跟进计划和下次跟进日期。'); return }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(nextDate + 'T00:00:00') < today) { setRecordError('跟进日期不能早于今天。'); return }
    updateCase(selected.id, { status: '跟进中', records: [...selected.records, { id: uid(), date: nowLabel(), method, summary: summary.trim(), plan: plan.trim(), nextDate }] })
    log(`新增干预记录 ${selected.id}（不记录内容）`)
    setSummary(''); setPlan(''); setNextDate(''); setRecordError(''); setDetailTab('记录与跟进'); setToast('干预与跟进记录已保存到本次演示。')
  }
  const list = (items: CareCase[]) => <div className="case-list">{items.map(item => <button className="case-card" key={item.id} onClick={() => open(item)}><div className="row"><span className="case-student"><span className="avatar">{item.student.slice(-1)}</span><span><b>{item.student}</b><small>{item.studentId} · {item.group}</small></span></span><RiskTag risk={item.risk}/></div><p>{item.topic}</p><div className="row"><small>{item.time} · 样例</small><span className={`status status-${item.status}`}>{item.status} ›</span></div></button>)}{!items.length && <div className="empty"><Icon name="check"/><p>当前筛选下没有记录</p><small>换个条件查看，或等待新的授权预警。</small></div>}</div>
  return <>
    {page === 'workbench' && requests.length > 0 && <section className="teacher-support-requests"><SectionTitle title="学生主动联系" sub="来自倾诉空间 · 已获学生授权 · 本次演示"/>{requests.map(r => <article className="surface" key={r.id}><div className="row"><b>{r.studentName}</b><Tag>{r.status}</Tag></div><p>{r.topic}</p><small>{r.studentId} · {r.time}</small><p className="subtle">仅含联系事项，无聊天原文；这不是自动风险判定。</p><Button disabled={r.status === '已受理'} onClick={() => { acceptRequest(r.id); log('受理学生联系请求 ' + r.id) }}>{r.status === '已受理' ? '已受理' : '受理联系请求'}</Button></article>)}</section>}

    {page === 'workbench' && <>
      <div className="page-heading"><span className="eyebrow">心理教师工作台 · 授权范围内</span><h1>{session.name}，你好</h1><p>从一条需要关注的变化，开始及时的支持。</p></div>
      <section className="teacher-highlight"><div><span>待复核预警</span><b>{pending.length.toString().padStart(2, '0')}</b><p>其中 {pending.filter(c => c.risk === '高').length} 条高风险样例</p></div><Icon name="shield"/><Button onClick={() => go('alerts')}>查看并处理 ›</Button></section>
      <div className="stats"><div><b>{active.length}</b><span>正在关注</span></div><div><b>{cases.filter(c => c.status === '跟进中').length}</b><span>持续跟进</span></div><div><b>{cases.filter(c => c.status === '已归档').length}</b><span>已归档</span></div></div>
      <SectionTitle title="优先关注" sub="风险摘要需结合专业判断" action={<button className="text-button" onClick={() => go('alerts')}>全部 ›</button>}/>{list(pending.slice(0, 3))}
      <section className="surface event-demo"><div className="row"><div><h3>预警到达演示</h3><p>体验高风险事件到达后的界面变化</p></div><Icon name="bell"/></div><Button block onClick={simulate} disabled={simulationSent}>{simulationSent ? '演示事件已接收' : '模拟接收高风险预警'}</Button>{toast && <p role="status" className="success-note">{toast}</p>}</section>
      <section className="gentle-note"><Icon name="shield"/><p>仅显示授权学生的必要摘要与趋势。聊天原文不进入教师工作台。</p></section>
    </>}
    {page === 'alerts' && <>
      <div className="page-heading"><h1>动态监测与预警</h1><p>高、中、低三级分类，按处理进度持续跟进。</p></div>
      <div className="pills wide">{['全部', '高', '中', '低'].map(r => <button key={r} className={riskFilter === r ? 'selected' : ''} onClick={() => setRiskFilter(r)}>{r === '全部' ? '全部' : `${r}风险`}</button>)}</div>
      <div className="filter-line"><Input aria-label="搜索授权学生" placeholder="搜索学生代称或脱敏编号" value={search} onChange={e => setSearch(e.target.value)}/><Select aria-label="预警处理状态" value={statusFilter} onChange={setStatusFilter} options={['全部状态', '待处理', '跟进中', '已归档'].map(value => ({ value, label: value }))}/></div>
      {list(cases.filter(c => (riskFilter === '全部' || c.risk === riskFilter) && (statusFilter === '全部状态' || c.status === statusFilter) && (c.student + c.studentId).includes(search)))}
      <DemoNote>风险级别来自虚构样例，不由前端分析真实学生对话。</DemoNote>
    </>}
    {page === 'archives' && <>
      <div className="page-heading"><h1>干预与跟进档案</h1><p>留下必要记录，让每一次支持有迹可循。</p></div>
      <div className="pills wide">{['全部状态', '跟进中', '已归档'].map(s => <button key={s} className={archiveFilter === s ? 'selected' : ''} onClick={() => setArchiveFilter(s)}>{s === '全部状态' ? '全部' : s}</button>)}</div>
      {list(cases.filter(c => c.records.length > 0 && (archiveFilter === '全部状态' || c.status === archiveFilter)))}
      <DemoNote>记录仅供授权心理教师使用，操作日志不包含辅导正文。</DemoNote>
    </>}
    {page === 'overview' && <>
      <div className="page-heading"><h1>阶段工作概览</h1><p>授权范围内的汇总样例，支持心理服务工作回顾。</p></div>
      <section className="surface"><div className="row"><h3>预警分布</h3><Tag>本次演示</Tag></div>{(['高', '中', '低'] as Risk[]).map(risk => <div className="risk-distribution" key={risk}><div className="row"><RiskTag risk={risk}/><small>{cases.filter(c => c.risk === risk).length} 条</small></div><Progress percent={Math.round(cases.filter(c => c.risk === risk).length / Math.max(1, cases.length) * 100)} showInfo={false} strokeColor={risk === '高' ? '#c9342b' : risk === '中' ? '#996000' : '#248a3d'}/></div>)}</section>
      <SectionTitle title="服务进展"/><div className="stats"><div><b>{cases.length}</b><span>授权个案</span></div><div><b>{cases.reduce((n, c) => n + c.records.length, 0)}</b><span>干预记录</span></div><div><b>{cases.filter(c => c.status === '已归档').length}</b><span>完成归档</span></div></div>
      <Alert type="info" title="汇总不代表全校情况" description="正式班级汇总的最小样本量、去标识化与访问范围由后端及学校政策确定。当前无真实班级数据。"/>
    </>}
    {page === 'profile' && <>
      <section className="profile-banner"><span className="avatar">陈</span><div><h1>{session.name}</h1><p>{session.id}</p><Tag color="green">授权心理教师 · 演示</Tag></div></section>
      <section className="surface spaced"><h3>当前访问范围</h3><div className="permission-row"><b>可查阅</b><span>授权个案趋势、三级预警摘要、阶段报告与干预档案</span></div><div className="permission-row"><b>不可查阅</b><span>原始聊天、未授权学生数据、系统角色管理</span></div><p className="subtle">真实访问控制必须由服务端实施。此处仅为前端角色页面演示。</p></section><Button block className="spaced" onClick={logout}>退出当前身份</Button>
    </>}
    <Sheet open={!!selected} onClose={() => setSelectedId(null)} title="授权个案详情">
      {selected && <><div className="row"><div><h2 className="sheet-heading">{selected.student}</h2><p className="subtle">{selected.studentId} · {selected.id}</p></div><RiskTag risk={selected.risk}/></div><div className="pills wide">{['概览', '记录与跟进', '阶段报告'].map(t => <button className={detailTab === t ? 'selected' : ''} key={t} onClick={() => setDetailTab(t)}>{t}</button>)}</div>
        {detailTab === '概览' && <><Alert type={selected.risk === '高' ? 'warning' : 'info'} title={`${selected.risk}风险样例 · ${selected.status}`} description={selected.topic}/><SectionTitle title="近期状态趋势" sub="授权摘要样例，不含聊天原文"/><Trend entries={initialMoods} metric="stress"/><div className="guidance"><h3>工作流程建议 · {selected.risk}风险 / {selected.topic}</h3><p>{selected.risk === '高' ? '优先由授权心理教师按学校既定流程复核，记录必要联系与处置情况，再制定跟进安排。' : selected.risk === '中' ? '结合状态趋势与专业判断安排沟通，明确下次联系时间，并持续记录变化。' : '按日常服务安排保持关注，记录学生愿意表达的支持需要与后续安排。'}</p><small>流程样例不是自动诊断或临床干预方案。</small></div><Button type="primary" block className="spaced" disabled={selected.status !== '待处理'} onClick={() => { updateCase(selected.id, { status: '跟进中' }); log(`接手预警 ${selected.id}`); setToast('已接手，进入跟进状态。') }}>{selected.status === '待处理' ? '接手并开始跟进' : selected.status}</Button><Button block className="spaced" onClick={() => setDetailTab('记录与跟进')}>填写干预与跟进记录</Button></>}
        {detailTab === '阶段报告' && <><Tag color="green">授权报告摘要 · 样例</Tag><h3 className="spaced">2026.09.22 — 2026.09.28</h3><Trend entries={initialMoods}/><p>样例阶段内存在状态起伏，需结合实际沟通与专业判断理解。此摘要不含聊天原文，也不对学生作诊断结论。</p><div className="permission-row"><b>当前处理状态</b><span>{selected.status}</span></div><div className="permission-row"><b>已记录服务</b><span>{selected.records.length} 次干预/跟进记录</span></div></>}
        {detailTab === '记录与跟进' && <><div className="record-timeline">{selected.records.length === 0 ? <p className="subtle">还没有干预记录，填写首次沟通与跟进安排。</p> : selected.records.map(r => <article key={r.id}><small>{r.date} · {r.method}</small><h3>过程记录</h3><p>{r.summary}</p><h3>后续计划</h3><p>{r.plan}</p><Tag>下次跟进 {r.nextDate}</Tag></article>)}</div>{selected.status !== '已归档' ? <form onSubmit={e => { e.preventDefault(); saveRecord() }}><SectionTitle title="新增干预记录"/><label className="field-label">沟通方式</label><Select aria-label="沟通方式" value={method} onChange={setMethod} options={['一对一面谈', '电话联系', '线上沟通', '跟进回访'].map(value => ({ value, label: value }))}/><label className="field-label" htmlFor="care-summary">过程记录</label><Input.TextArea id="care-summary" placeholder="仅填写必要的专业服务记录；请勿复制聊天原文" rows={3} value={summary} maxLength={1000} onChange={e => setSummary(e.target.value)}/><label className="field-label" htmlFor="care-plan">后续跟进计划</label><Input.TextArea id="care-plan" rows={2} value={plan} maxLength={500} onChange={e => setPlan(e.target.value)}/><label className="field-label" htmlFor="care-date">下次跟进日期</label><Input id="care-date" type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}/>{recordError && <p className="error-text" role="alert">{recordError}</p>}<Button block type="primary" htmlType="submit" className="spaced">保存干预记录</Button>{selected.records.length > 0 && <div className="archive-action"><Checkbox checked={archiveConfirm} onChange={e => setArchiveConfirm(e.target.checked)}>已完成专业复核，本阶段服务可以归档（演示）</Checkbox><Button block disabled={!archiveConfirm} className="spaced" onClick={() => { updateCase(selected.id, { status: '已归档' }); log(`归档授权个案 ${selected.id}`); setToast('本阶段档案已归档。') }}>完成本阶段归档</Button></div>}</form> : <Alert type="success" title="本阶段已归档" description="记录以只读形式保留。"/>}</>}
        {toast && <p role="status" className="success-note">{toast}</p>}
        <DemoNote>仅保存到当前演示会话，不向真实教师或学生发送信息。</DemoNote>
      </>}
    </Sheet>
  </>
}

