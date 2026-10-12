import type { TeacherPage } from './TeacherArea'

/** Teacher-only symbols; keep the student icon set independent. */
export function TeacherNavIcon({ page, selected }: { page: TeacherPage; selected: boolean }) {
  const paths = {
    workbench: <><rect x="5" y="4" width="14" height="17" rx="3" fill={selected?'currentColor':'none'}/><path d="M9 4V3h6v1M8.5 9h7M8.5 13h7M8.5 17h4" stroke={selected?'#fff':'currentColor'}/></>,
    triage: <><path d="M7 9a5 5 0 0 1 10 0v4l2 3H5l2-3ZM10 20h4"/><circle cx="18" cy="5" r="2.5" fill="currentColor" stroke="none"/></>,
    care: <><rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="9" r="2.5"/><path d="M8 16a4 4 0 0 1 8 0M8 18h8"/></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M13 14h2M7 17h2"/></>,
    profile: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6.5 19a5.5 5.5 0 0 1 11 0"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={selected ? 2 : 1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[page]}</svg>
}
