import { useState } from 'react'
import { Button } from 'antd'
import type { CareCase } from '../../types/domain'
import { SectionTitle } from '../../components/shared/Shared'

export function TeacherHistory({ item, onShowEscalation }: { item: CareCase; onShowEscalation: () => void }) {
  const [filter, setFilter] = useState('全部')
  const entries = [
    ...item.records.map(record => ({ id: record.id, time: record.date, kind: record.method === '跟进回访' ? '回访' : '沟通', record, escalation: undefined })),
    ...(item.escalations || []).map(escalation => ({ id: escalation.id, time: escalation.time, kind: '升级', record: undefined, escalation })),
  ].sort((a, b) => b.time.localeCompare(a.time))
  const visible = entries.filter(entry => filter === '全部' || entry.kind === filter)
  return <section className="tw-history"><SectionTitle title="沟通与跟进记录" sub={`${item.records.length} 次已记录服务 · ${item.escalations?.length || 0} 次升级事项`}/>
    <div className="tw-history-filters" aria-label="历史记录筛选">{['全部', '沟通', '回访', '升级'].map(value => <button type="button" key={value} className={filter === value ? 'selected' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}<small>{entries.filter(entry => value === '全部' || entry.kind === value).length}</small></button>)}</div>
    <p className="tw-history-count" role="status">{visible.length} 条{filter === '全部' ? '历史' : filter}记录 · 最新优先</p>
    <div className="teacher-timeline">{visible.map(entry => <article key={`${entry.kind}-${entry.id}`} data-history-kind={entry.kind}><header className="tw-history-entry-header"><b>{entry.kind}</b><small>{entry.time}{entry.record && ` · ${entry.record.method}`}</small></header>{entry.record ? <><h3>{entry.kind === '回访' ? '回访情况' : '沟通记录'}</h3><p>{entry.record.summary}</p>{entry.record.response && <><h3>学生反馈</h3><p>{entry.record.response}</p></>}<h3>跟进计划</h3><p>{entry.record.plan}</p><span>下次跟进 · {entry.record.nextDate}</span></> : entry.escalation && <><h3>协调对象</h3><p>{entry.escalation.recipient}</p><h3>原因与已采取措施</h3><p>{entry.escalation.reason}</p><span>{entry.escalation.acknowledged ? '模拟接收已确认' : '待确认'}</span><Button type="link" onClick={onShowEscalation}>查看升级处置</Button></>}</article>)}{!visible.length && <div className="tw-history-empty"><p>{entries.length ? `暂无${filter}记录` : '暂无服务或升级记录'}</p><small>{filter === '全部' ? '保存后的记录会显示在这里。' : '切换其他类型查看已有记录。'}</small></div>}</div>
  </section>
}
