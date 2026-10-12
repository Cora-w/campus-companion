import type { Appointment } from '../teacher/workspaceModel'
import { appointmentError } from '../teacher/workspaceModel.ts'

export type InvitationReply = { status: '已接受' | '申请改期' | '已婉拒'; changeRequest?: Appointment['changeRequest']; declineReason?: string }
export function invitationResponse(item: Appointment | undefined, studentId: string, reply: InvitationReply, now = Date.now()): { error: string; appointment?: Appointment } {
  if (!item || item.studentAccountId !== studentId || item.status !== '已安排' || ['申请改期', '已婉拒'].includes(item.responseStatus || '')) return { error: '当前邀请无法回应，请查看最新安排。' }
  if (new Date(`${item.day}T${item.start}:00+08:00`).getTime() <= now) return { error: '约定时间已到，请联系老师重新安排。' }
  if (reply.status === '已接受' && item.responseStatus === '已接受') return { error: '你已接受这次约谈。' }
  if (reply.status === '已婉拒' && item.responseStatus === '已接受') return { error: '你已接受约谈，时间有变请申请改期。' }
  if (reply.status === '申请改期') {
    if (!reply.changeRequest?.reason.trim()) return { error: '请填写改期原因。' }
    if (reply.changeRequest.reason.length > 300) return { error: '改期原因最多 300 字。' }
    const error = appointmentError({ ...item, day: reply.changeRequest.day, start: reply.changeRequest.start }, [], now)
    if (error) return { error }
  }
  if (reply.status === '已婉拒' && !reply.declineReason?.trim()) return { error: '请填写暂不参加的原因，方便老师了解。' }
  if ((reply.declineReason?.length || 0) > 300) return { error: '说明最多 300 字。' }
  return { error: '', appointment: { ...item, responseStatus: reply.status, changeRequest: reply.status === '申请改期' ? { ...reply.changeRequest!, reason: reply.changeRequest!.reason.trim() } : undefined, declineReason: reply.status === '已婉拒' ? reply.declineReason!.trim() : undefined } }
}
