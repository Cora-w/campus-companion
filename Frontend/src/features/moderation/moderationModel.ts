import type { CampusPost } from '../../data/campusData'
export const priorityReportCount = 3
export const reportReasons = ['不友善或冒犯内容', '泄露个人信息', '广告或虚假信息', '其他']
export type PostReport = { id: string; postId: string; schoolId: string; reporterId: string; reason: string; time: string; resolved: boolean }
export type PostDecision = { id: string; postId: string; schoolId: string; action: '删除' | '保留'; reason: string; time: string; actorId: string }
export type ModerationState = { posts: { schoolId: string; post: CampusPost }[]; reports: PostReport[]; decisions: PostDecision[] }
export type Moderator = { id: string; role: string; schoolId: string; enabled: boolean }
export function submitPostReport(state: ModerationState, actor: Moderator, report: PostReport): { state: ModerationState; error: string } {
  const post = state.posts.find(p => p.post.id === report.postId && p.schoolId === actor.schoolId)?.post
  if (!actor.enabled || actor.role !== 'student' || !actor.schoolId || report.schoolId !== actor.schoolId || report.reporterId !== actor.id) return { state, error: '请使用已绑定学校的学生账号。' }
  if (!post || (post.visibility && post.visibility !== 'campus') || state.decisions.some(d => d.postId === post.id && d.schoolId === actor.schoolId && d.action === '删除')) return { state, error: '帖子不存在或已被删除。' }
  if (post.ownerId === actor.id) return { state, error: '不能举报自己的帖子。' }
  if (!reportReasons.includes(report.reason)) return { state, error: '请选择有效的举报原因。' }
  if (state.reports.some(r => r.postId === post.id && r.schoolId === actor.schoolId && r.reporterId === actor.id)) return { state, error: '你已经举报过这条帖子，请勿重复提交。' }
  return { state: { ...state, reports: [{ ...report, resolved: false }, ...state.reports] }, error: '' }
}
export function reviewPost(state: ModerationState, actor: Moderator, decision: PostDecision): { state: ModerationState; error: string } {
  if (!actor.enabled || actor.role !== 'admin' || !actor.schoolId || decision.schoolId !== actor.schoolId || decision.actorId !== actor.id) return { state, error: '无权处理帖子。' }
  const post = state.posts.find(p => p.post.id === decision.postId && p.schoolId === actor.schoolId)?.post
  if (!post || (post.visibility && post.visibility !== 'campus') || state.decisions.some(d => d.postId === post.id && d.schoolId === actor.schoolId && d.action === '删除')) return { state, error: '帖子不存在或已被删除。' }
  if (!decision.reason.trim()) return { state, error: '请填写审核说明。' }
  if (decision.reason.length > 300) return { state, error: '审核说明最多 300 字。' }
  if (decision.action !== '删除' && decision.action !== '保留') return { state, error: '无效的审核操作。' }
  return { state: { ...state, reports: state.reports.map(r => r.postId === post.id && r.schoolId === actor.schoolId ? { ...r, resolved: true } : r), decisions: [{ ...decision, reason: decision.reason.trim() }, ...state.decisions] }, error: '' }
}
