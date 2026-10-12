import { Drawer } from '../../navigation/BackOverlays'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { Tag } from 'antd'
import type { MoodEntry, Risk } from '../../data/data'
import { riskColors } from '../../data/data'

export function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/></>,
    edit: <><path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/></>,
    bag: <><path d="M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/></>,
    categories: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7m-3.5-3.5v7"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4Z"/>,
    like: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    next: <path d="m9 5 7 7-7 7"/>,
    guide: <><path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z"/></>,
    food: <><path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v18M18 3v18M18 3c-4 3-4 10 0 10"/></>,
    home: <path d="m3 10 9-7 9 7v10H15v-7H9v7H3Z" />,
    chat: <><path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9.5 9.5 0 0 1 19 0Z"/><path d="M7 9h9M7 13h5"/></>,
    trend: <><path d="M3 3v18h18M6 15l4-5 4 3 6-8"/></>,
    report: <><path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h5"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9ZM10 21h4"/></>,
    back: <path d="m14 5-7 7 7 7"/>,
    shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.chat}</svg>
}
export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{action}</div>
}
export function RiskTag({ risk }: { risk: Risk }) { return <Tag color={riskColors[risk]}>{risk}风险</Tag> }
export function Sheet({ title, open, onClose, children, zIndex, footer, fullScreen, compact }: { zIndex?: number; title: string; open: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode; fullScreen?: boolean; compact?: boolean }) {
  return <Drawer rootClassName={compact ? 'compact-sheet' : fullScreen ? 'community-fullscreen' : undefined} zIndex={zIndex} footer={footer} title={title} placement="bottom" open={open} onClose={onClose} size="default" className="mobile-sheet" closable={{ placement: 'end' }} destroyOnHidden>{children}</Drawer>
}
export function Trend({ entries, metric = 'mood' }: { entries: MoodEntry[]; metric?: 'mood' | 'stress' }) {
  const gradientId = useId()
  const values = entries.slice(-7)
  const points = values.map((e, i) => `${26 + i * (268 / Math.max(1, values.length - 1))},${122 - e[metric] * 19}`).join(' ')
  return <div className="trend-chart" role="img" aria-label={values.map(e => `${e.day}，${metric === 'mood' ? '心情' : '压力'} ${e[metric]} / 5`).join('；')}>
    <svg viewBox="0 0 320 155" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".35"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>{[27,65,103].map(y=><line key={y} x1="16" x2="305" y1={y} y2={y} stroke="#dedee3" strokeDasharray="4 5"/>)}<polygon points={`26,128 ${points} 294,128`} fill={`url(#${gradientId})`}/><polyline points={points} stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>{values.map((e,i)=><g key={e.id}><circle cx={26+i*(268/Math.max(1,values.length-1))} cy={122-e[metric]*19} r="3.5" fill="#ffffff" stroke="var(--accent)" strokeWidth="2"/><text x={26+i*(268/Math.max(1,values.length-1))} y="150" textAnchor="middle" fill="#63636b" fontSize="9">{e.day}</text></g>)}</svg>
  </div>
}
export function DemoNote({ children }: { children?: ReactNode }) { return <p className="demo-note">{children || '演示数据 · 不构成心理评估或诊断'}</p> }

