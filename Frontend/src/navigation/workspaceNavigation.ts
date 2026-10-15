import type { Role } from '../types/domain'
import type { TeacherPage } from '../features/teacher/TeacherArea'
import type { AdminPage } from '../features/admin/AdminArea'
export type StaffTarget = { role: 'teacher'; page: TeacherPage } | { role: 'admin'; page: AdminPage }
export type StaffEntry = { label: string; hint: string; icon: string; target: StaffTarget }
export const teacherEntries: StaffEntry[] = [
  { label: '心理支持工作台', hint: '待办与今日安排', icon: 'home', target: { role: 'teacher', page: 'workbench' } },
  { label: '预警中心', hint: '复核与持续关注', icon: 'bell', target: { role: 'teacher', page: 'triage' } },
  { label: '学生支持档案', hint: '授权范围内的服务记录', icon: 'users', target: { role: 'teacher', page: 'care' } },
  { label: '咨询日程', hint: '安排咨询与回访', icon: 'guide', target: { role: 'teacher', page: 'schedule' } },
  { label: '教师服务设置', hint: '服务范围与提醒偏好', icon: 'settings', target: { role: 'teacher', page: 'profile' } },
]
export const adminEntries: StaffEntry[] = [
  { label: '账号管理', hint: '身份与账号状态', icon: 'users', target: { role: 'admin', page: 'accounts' } },
  { label: '开店授权', hint: '学生店铺权限', icon: 'bag', target: { role: 'admin', page: 'shops' } },
  { label: '校园通知', hint: '发布与管理通知', icon: 'bell', target: { role: 'admin', page: 'announcements' } },
  { label: '反馈处理', hint: '跟进与回复校园反馈', icon: 'chat', target: { role: 'admin', page: 'feedback' } },
  { label: '帖子举报与违规审核', hint: '审核举报，维护公开内容', icon: 'shield', target: { role: 'admin', page: 'moderation' } },
  { label: '管理资料与操作记录', hint: '管理职责与操作留痕', icon: 'report', target: { role: 'admin', page: 'profile' } },
]
export function staffEntries(role: Role | undefined) { return role === 'teacher' ? teacherEntries : role === 'admin' ? adminEntries : [] }
export function canOpenStaffTarget(role: Role | undefined, target: StaffTarget) { return role === target.role && staffEntries(role).some(entry => entry.target.page === target.page) }
