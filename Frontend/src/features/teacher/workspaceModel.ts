import { schoolDate, schoolToday } from './teacherData.ts'

export type Appointment = { id: string; caseId: string; teacherId: string; studentAccountId?: string; example?: boolean; day: string; start: string; duration: number; method: string; location: string; status: '已安排' | '已完成' | '未到访' | '已取消'; responseStatus?: '待确认' | '已接受' | '申请改期' | '已婉拒'; declineReason?: string; changeRequest?: { day: string; start: string; reason: string }; note?: string }
export const invitationLabel = (item: Appointment) => item.status !== '已安排' ? item.status : item.responseStatus || '已安排'
export const demoAppointments: Appointment[] = [
  { id: 'APT-STUDENT-EXAMPLE', caseId: 'CASE-001', teacherId: 'T-DEMO-01', studentAccountId: 'S-DEMO-01', example: true, day: schoolDate(1), start: '17:00', duration: 45, method: '一对一面谈', location: '心理中心 · 咨询室 01（示例）', status: '已安排', responseStatus: '待确认' },
  { id: 'APT-01', caseId: 'CASE-002', teacherId: 'T-DEMO-01', day: schoolToday(), start: '10:30', duration: 45, method: '一对一面谈', location: '心理中心 · 咨询室 02（示例）', status: '已安排' },
  { id: 'APT-02', caseId: 'CASE-002', teacherId: 'T-DEMO-01', day: schoolDate(1), start: '14:00', duration: 30, method: '跟进回访', location: '心理中心 · 咨询室 02（示例）', status: '已安排' },
]
export const minutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute }
export const endTime = (time: string, duration: number) => { const end = minutes(time) + duration; return `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}` }
export function appointmentError(candidate: Appointment, existing: Appointment[], now = Date.now()) {
  if (!candidate.caseId || !candidate.location.trim()) return '请选择学生并填写地点或联系安排。'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.start)) return '请填写有效日期和开始时间。'
  if (![30, 45, 60].includes(candidate.duration) || minutes(candidate.start) + candidate.duration > 1440) return '请选择有效时长，预约不能跨越当天。'
  const start = new Date(`${candidate.day}T${candidate.start}:00+08:00`)
  if (Number.isNaN(start.getTime()) || start.getTime() <= now) return '预约开始时间必须晚于当前时间。'
  if (existing.some(item => item.id !== candidate.id && item.teacherId === candidate.teacherId && item.status === '已安排' && item.day === candidate.day && minutes(candidate.start) < minutes(item.start) + item.duration && minutes(item.start) < minutes(candidate.start) + candidate.duration)) return '该时段与已有预约冲突，请调整时间。'
  return ''
}
