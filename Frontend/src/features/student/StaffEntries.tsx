import type { Role } from '../../types/domain'
import { Icon } from '../../components/shared/Shared'
import { useCommunity } from '../moderation/CommunityContext'
import { staffEntries } from '../../navigation/workspaceNavigation'
import type { StaffTarget } from '../../navigation/workspaceNavigation'
import './StaffEntries.css'
export function StaffEntries({ role, onOpen, pending }: { role: Role; onOpen: (target: StaffTarget) => void; pending: number }) {
  const { posts, reports } = useCommunity()
  const entries = staffEntries(role)
  if (!entries.length) return null
  const moderationCount = new Set(reports.filter(r => !r.resolved && posts.some(p => p.id === r.postId)).map(r => r.postId)).size
  return <section className="profile-staff-section" aria-label={role === 'teacher' ? '心理教师服务' : '校园管理服务'}><div className="profile-staff-heading"><h2>{role === 'teacher' ? '心理教师服务' : '校园管理服务'}</h2><span>身份专属</span></div><div className="profile-section profile-staff-menu">{entries.map(entry => {
    const count = entry.target.page === 'triage' ? pending : entry.target.page === 'moderation' ? moderationCount : 0
    return <button key={entry.target.page} aria-label={entry.label} onClick={() => onOpen(entry.target)}><span className="profile-icon"><Icon name={entry.icon}/></span><span className="profile-staff-copy"><b>{entry.label}</b><small>{entry.hint}</small></span>{count > 0 && <span className="profile-staff-count" aria-label={`${count} 条待处理`}>{count}</span>}</button>
  })}</div></section>
}
