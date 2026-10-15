import type { Role } from '../types/domain'
import type { HubPage } from '../data/hubData'
import type { StaffTarget } from './workspaceNavigation'

export type CampusService = { id: string; name: string; words: string; icon: string } & (
  { hub: HubPage; target?: never } | { target: StaffTarget; hub?: never }
)

export function campusServices(role: Role): CampusService[] {
  const common: CampusService[] = [
    { id: 'guide', name: '校园指南', words: '课表 教室 老师 办公室 地图 通知 四六级', icon: 'location', hub: 'guide' },
    { id: 'market', name: '校园闲置', words: '二手 买卖 教材', icon: 'bookmark', hub: 'market' },
    { id: 'activities', name: '活动搭子', words: '活动 报名 组队 比赛', icon: 'users', hub: 'activities' },
  ]
  if (role === 'teacher') return [...common, { id: 'teacher-schedule', name: '咨询日程', words: '约谈 预约 咨询 日程 安排 回访', icon: 'guide', target: { role: 'teacher', page: 'schedule' } }]
  if (role === 'admin') return [...common, { id: 'admin-feedback', name: '反馈处理', words: '反馈 建议 问题 回复 处理', icon: 'report', target: { role: 'admin', page: 'feedback' } }]
  return role === 'student' ? [...common, { id: 'listen', name: '倾诉空间', words: '倾诉 吐槽 倾听', icon: 'chat', hub: 'listen' }] : common
}
