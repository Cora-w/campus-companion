import type { ReactNode } from 'react'
import { Icon } from '../../components/shared/Shared'
import { StaffHelp } from '../../components/shared/StaffHelp'
import type { Session } from '../../types/domain'
import type { TeacherPage } from './TeacherArea'
import { TeacherNavIcon } from './TeacherNavIcon'
import { schoolToday } from './teacherData'

const navigation: { page: TeacherPage; label: string; icon: string }[] = [
  { page: 'workbench', label: '工作台', icon: 'home' }, { page: 'triage', label: '预警', icon: 'bell' }, { page: 'care', label: '学生', icon: 'users' }, { page: 'schedule', label: '日程', icon: 'guide' }, { page: 'profile', label: '我的', icon: 'profile' },
]
export function TeacherLayout({ page, go, session, pending, children }: { page: TeacherPage; go: (page: TeacherPage) => void; session: Session; pending: number; children: ReactNode }) {
  const titles: Record<TeacherPage, string> = { workbench: '心理支持工作台', triage: '预警中心', care: '学生档案', schedule: '咨询日程', profile: '我的' }
  return <div className={`tw-shell tw-page-${page} tw-native tw-refresh`}>
    <header className="tw-app-header"><div>{page !== 'workbench' && <button aria-label="返回上一页" onClick={()=>window.campusBack?.()}><Icon name="back"/></button>}<b>心伙伴<span className="tw-header-role">心理教师</span></b></div><StaffHelp role="teacher"/></header>
    <main key={page} className="tw-content"><div className="tw-page-heading"><div><span className="tw-kicker">{page === 'workbench' ? schoolToday().replaceAll('-', '.') + ' · 教师服务' : '心理支持 · 授权范围内'}</span><h1>{page === 'workbench' ? '工作台' : page === 'profile' ? '设置' : titles[page]}</h1><p>{page === 'workbench' ? `${session.name} · 心理支持与跟进` : page === 'triage' ? '复核线索，记录处置，让关注及时得到回应。' : page === 'care' ? '状态、沟通与支持计划，集中在一份档案里。' : page === 'schedule' ? '安排咨询与回访，跟踪每一次到访。' : '你的负责范围与工作偏好。'}</p></div></div>{children}<footer className="tw-footer"><span>演示工作区 · 仅展示授权范围内的样例</span></footer></main>
    <nav className="tw-app-nav" aria-label="教师主导航">{navigation.map(item => <button key={item.page} aria-label={item.label} aria-current={page === item.page ? 'page' : undefined} className={page === item.page ? 'active' : ''} onClick={() => go(item.page)}><span><TeacherNavIcon page={item.page} selected={page === item.page}/>{item.page === 'triage' && pending > 0 && <em>{pending}</em>}</span><b>{item.label}</b></button>)}</nav>
  </div>
}
