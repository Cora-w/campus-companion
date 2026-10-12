import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Account, Session } from '../../types/domain'
import { nowLabel, uid } from '../../data/data'
import { Context, schoolFor } from './CampusOperationsContext'
import type { State, Operations, CampusNotice, StudentFeedback } from './CampusOperationsContext'
export function CampusOperationsProvider({ session, accounts, log, children }: { session: Session | null; accounts: Account[]; log: (action: string) => void; children: ReactNode }) {
  const [state, setState] = useState<State>({ notices: [], feedback: [] })
  const latest = useRef(state)
  const commit = (next: State) => { latest.current = next; setState(next) }
  const admin = () => !!session && session.role === 'admin' && accounts.some(a => a.id === session.id && a.enabled && a.role === 'admin')
  const saveNotice: Operations['saveNotice'] = draft => {
    const schoolId = schoolFor(session)
    if (!admin() || !schoolId) return '请使用已绑定学校的管理员账号。'
    if (!draft.title.trim() || !draft.body.trim()) return '请填写通知标题和正文。'
    if (draft.title.length > 60 || draft.body.length > 2000) return '标题最多 60 字，正文最多 2000 字。'
    const current = latest.current.notices.find(n => n.id === draft.id)
    if (draft.id && (!current || current.schoolId !== schoolId)) return '无权修改这条通知。'
    const next: CampusNotice = { ...draft, id: current?.id || uid(), schoolId, title: draft.title.trim(), body: draft.body.trim(), time: nowLabel() }
    commit({ ...latest.current, notices: [next, ...latest.current.notices.filter(n => n.id !== next.id)] })
    log(`${next.status === '已发布' ? '发布校园通知' : current?.status === '已发布' ? '撤回校园通知' : '保存通知草稿'} ${next.id}`)
    return ''
  }
  const submitFeedback: Operations['submitFeedback'] = record => {
    const schoolId = schoolFor(session)
    if (!session || session.role !== 'student' || !schoolId || !accounts.some(a => a.id === session.id && a.enabled && a.role === 'student')) return '请使用已绑定学校的学生账号。'
    if ((record.text.trim().length < 5 && !record.images.length) || record.text.length > 500 || record.images.length > 3) return '请填写至少 5 个字，或附上问题截图。'
    const next: StudentFeedback = { ...record, text: record.text.trim(), images: [...record.images], id: uid(), schoolId, studentId: session.id, studentName: session.name, time: nowLabel(), status: '待处理', reply: '' }
    commit({ ...latest.current, feedback: [next, ...latest.current.feedback] })
    return ''
  }
  const replyFeedback: Operations['replyFeedback'] = (id, reply, status) => {
    if (!admin()) return '无权处理反馈。'
    const item = latest.current.feedback.find(f => f.id === id && f.schoolId === schoolFor(session))
    if (!item) return '反馈不存在或不属于本校。'
    if (status === '已回复' && !reply.trim()) return '请填写回复内容。'
    if (reply.length > 1000) return '回复最多 1000 字。'
    if (item.status === '已回复' && status !== '已回复') return '已回复的反馈不能改回待处理。'
    commit({ ...latest.current, feedback: latest.current.feedback.map(f => f.id === id ? { ...f, status, reply: status === '已回复' ? reply.trim() : f.reply } : f) })
    log(`${status === '已回复' ? '回复学生反馈' : '开始处理反馈'} ${id}`)
    return ''
  }
  return <Context.Provider value={{ ...state, session, saveNotice, submitFeedback, replyFeedback }}>{children}</Context.Provider>
}
