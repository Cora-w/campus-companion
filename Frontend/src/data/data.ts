import type { Role, Session, Risk, CareCase, Account, MoodEntry, Report } from '../types/domain'
export type { Role, Session, Risk, CaseStatus, CareRecord, CareCase, Account, Audit, MoodEntry, Report } from '../types/domain'
export const roleNames: Record<Role, string> = { student: '学生', teacher: '心理教师', admin: '管理员', merchant: '商家' }
export const riskColors: Record<Risk, string> = { 高: 'volcano', 中: 'gold', 低: 'green' }
export const roleSessions: Record<Role, Session> = {
  merchant: { role: 'merchant', name: '下课零食社店长', id: 'M-DEMO-01' },
  student: { role: 'student', name: '小禾同学', id: 'S-DEMO-01' },
  teacher: { role: 'teacher', name: '陈老师', id: 'T-DEMO-01' },
  admin: { role: 'admin', name: '平台管理员', id: 'A-DEMO-01' },
}
export const initialCases: CareCase[] = [
  { id: 'CASE-001', student: '同学 A', studentId: 'S***021', group: '计算机专业 · 一年级', risk: '高', topic: '近期状态变化需专业复核', time: '09-29 09:20', status: '待处理', records: [] },
  { id: 'CASE-002', student: '同学 B', studentId: 'S***036', group: '智能制造专业 · 二年级', risk: '中', topic: '学习压力与适应情况', time: '09-28 16:40', status: '跟进中', records: [{ id: 'R-001', date: '09-28 17:10', method: '一对一面谈', summary: '已完成首次联系，约定后续面谈。此处为虚构记录。', plan: '下次面谈了解学习与生活近况。', nextDate: '2026-10-02' }] },
  { id: 'CASE-003', student: '同学 C', studentId: 'S***052', group: '电子信息专业 · 一年级', risk: '低', topic: '日常状态观察', time: '09-27 14:00', status: '跟进中', records: [] },
]
export const initialAccounts: Account[] = [
  { id: 'M-DEMO-01', name: '下课零食社店长', role: 'merchant', enabled: true },
  { id: 'M-DEMO-02', name: '小麦面包房店长', role: 'merchant', enabled: true },
  { id: 'A-DEMO-01', name: '平台管理员', role: 'admin', enabled: true },
  { id: 'T-DEMO-01', name: '陈老师', role: 'teacher', enabled: true },
  { id: 'T-DEMO-02', name: '李老师', role: 'teacher', enabled: false },
  { id: 'S-DEMO-01', name: '小禾同学', role: 'student', enabled: true },
]
export const initialMoods: MoodEntry[] = [
  { id: 'M1', day: '09-23', mood: 3, stress: 3, note: '' },
  { id: 'M2', day: '09-24', mood: 4, stress: 2, note: '' },
  { id: 'M3', day: '09-25', mood: 3, stress: 4, note: '' },
  { id: 'M4', day: '09-26', mood: 2, stress: 4, note: '' },
  { id: 'M5', day: '09-27', mood: 3, stress: 3, note: '' },
  { id: 'M6', day: '09-28', mood: 4, stress: 2, note: '' },
]
export const reports: Report[] = [
  { id: 'REP-01', title: '这一周，和自己慢慢相处', period: '2026.09.22 — 2026.09.28', state: '可查阅', summary: '样例记录呈现了不同日期的心情起伏。一次记录无法代表你的全部状态，你可以结合当时发生的事情回看这一周。' },
  { id: 'REP-02', title: '九月阶段回顾', period: '2026.09.01 — 2026.09.30', state: '生成中', summary: '' },
]
export const nowLabel = () => new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
export const uid = () => crypto.randomUUID()


