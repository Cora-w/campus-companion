import { createContext, useContext } from 'react'
import type { Session } from '../../types/domain'
export type CampusNotice = { id: string; schoolId: string; title: string; body: string; status: '草稿' | '已发布'; time: string }
export type StudentFeedback = { id: string; schoolId: string; studentId: string; studentName: string; text: string; images: string[]; time: string; status: '待处理' | '处理中' | '已回复'; reply: string }
export type State = { notices: CampusNotice[]; feedback: StudentFeedback[] }
export type Operations = State & { session: Session | null; saveNotice: (draft: { id?: string; title: string; body: string; status: CampusNotice['status'] }) => string; submitFeedback: (record: { text: string; images: string[] }) => string; replyFeedback: (id: string, reply: string, status: StudentFeedback['status']) => string }
export const Context = createContext<Operations | null>(null)
export function schoolFor(session: Session | null) { try { return session ? localStorage.getItem('campus-school-v1:' + session.id) || '' : '' } catch { return '' } }
// The school gate can bind a school after the provider mounts.
export function useCampusOperations() {
  const value = useContext(Context)
  if (!value) throw new Error('Missing campus operations provider')
  const schoolId = schoolFor(value.session)
  return { ...value, notices: value.notices.filter(n => n.schoolId === schoolId), feedback: value.feedback.filter(f => f.schoolId === schoolId && (value.session?.role === 'admin' || f.studentId === value.session?.id)) }
}
