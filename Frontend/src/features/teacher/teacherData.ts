import type { CareCase, CaseStatus, Risk } from '../../types/domain'

export const statusNames: Record<CaseStatus, string> = { 待处理: '待复核', 跟进中: '跟进中', 已归档: '已结案' }
export const attentionNames: Record<Risk, string> = { 高: '高风险', 中: '中风险', 低: '低风险' }
export const nextFollowUp = (item: CareCase) => item.observation?.nextDate || item.records.at(-1)?.nextDate
export const schoolToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
export const teacherTimestamp = () => schoolToday() + ' ' + new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
export const schoolDate = (offset: number) => {
  const date = new Date(`${schoolToday()}T12:00:00+08:00`)
  date.setUTCDate(date.getUTCDate() + offset)
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(date)
}
export const teacherCases: CareCase[] = [
  { id: 'CASE-001', teacherId: 'T-DEMO-01', student: '同学 A', studentId: 'S***021', studentAccountId: 'S-DEMO-01', group: '计算机专业 · 一年级', risk: '高', topic: '近期压力持续上升，需及时复核', time: `${schoolToday()} 09:20`, status: '待处理', source: 'AI 状态摘要 · 模拟', summary: '样例显示近期学习与适应压力增加，日常安排受到影响。建议先确认学生当前的支持需要，并由教师结合实际沟通复核。', signals: ['压力变化持续出现', '生活节奏受到影响'], trend: [2, 2, 3, 3, 4, 5].map((stress, i) => ({ id: `A-${i}`, day: schoolDate(i - 5).slice(5), stress, mood: 3, note: '' })), records: [] },
  { id: 'CASE-002', teacherId: 'T-DEMO-01', student: '同学 B', studentId: 'S***036', group: '智能制造专业 · 二年级', risk: '中', topic: '学习与适应压力，已安排回访', time: `${schoolDate(-2)} 16:40`, status: '跟进中', source: 'AI 状态摘要 · 模拟', summary: '首次沟通后已明确学生的学习适应需要，正在按约定持续跟进。', signals: ['学习适应需要', '需要持续沟通'], trend: [4, 4, 3, 4, 3, 3].map((stress, i) => ({ id: `B-${i}`, day: schoolDate(i - 5).slice(5), stress, mood: 3, note: '' })), review: { conclusion: '需要跟进', note: '样例复核：已完成首次联系，并约定回访。', time: `${schoolDate(-2)} 17:00` }, records: [{ id: 'R-001', date: `${schoolDate(-2)} 17:10`, method: '一对一面谈', summary: '样例：已完成首次沟通，确认学生希望获得学习适应方面的支持。', plan: '回访近期学习与生活安排，确认支持需要是否变化。', nextDate: schoolToday() }] },
  { id: 'CASE-003', teacherId: 'T-DEMO-01', student: '同学 C', studentId: 'S***052', group: '电子信息专业 · 一年级', risk: '低', topic: '日常适应情况，等待首次复核', time: `${schoolDate(-1)} 14:00`, status: '待处理', source: 'AI 状态摘要 · 模拟', summary: '样例提示学生希望有人倾听近期适应情况，需要通过沟通了解实际支持需求。', signals: ['适应情况待确认'], trend: [2, 3, 2, 2, 3, 2].map((stress, i) => ({ id: `C-${i}`, day: schoolDate(i - 5).slice(5), stress, mood: 3, note: '' })), records: [] },
  { id: 'CASE-004', teacherId: 'T-DEMO-01', student: '同学 D', studentId: 'S***078', group: '计算机专业 · 二年级', risk: '低', topic: '本阶段支持已完成', time: `${schoolDate(-3)} 10:00`, status: '已归档', source: 'AI 状态摘要 · 模拟', summary: '样例：完成阶段沟通与回访，学生当前暂无新增支持需求。', signals: ['阶段回访已完成'], records: [{ id: 'R-002', date: `${schoolDate(-3)} 10:00`, method: '跟进回访', summary: '样例：已完成回访，确认本阶段服务结束。', plan: '告知后续可继续联系心理中心。', nextDate: schoolDate(-3) }], closure: { note: '样例：完成阶段复核与回访，本阶段结案。', time: `${schoolDate(-3)} 11:00` } },
]
