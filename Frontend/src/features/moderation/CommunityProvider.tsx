import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { campusPosts, categories } from '../../data/campusData'
import { placeCommunityPosts } from '../discover/communityModel'
import type { Account, Session } from '../../types/domain'
import { nowLabel, uid } from '../../data/data'
import { schoolFor } from '../admin/CampusOperationsContext'
import { CommunityContext } from './CommunityContext'
import type { CommunityOperations } from './CommunityContext'
import { reviewPost, submitPostReport } from './moderationModel'
import type { ModerationState } from './moderationModel'
const demoSchool = 'sichuan-aerospace-polytechnic'
const wallCategories = categories.filter(c => !['新生指南', '闲置互助', '活动搭子', '匿名树洞'].includes(c))
export function CommunityProvider({ session, accounts, log, children }: { session: Session | null; accounts: Account[]; log: (action: string) => void; children: ReactNode }) {
  const [state, setState] = useState<ModerationState>(() => ({ posts: [...placeCommunityPosts, ...campusPosts.filter(p => wallCategories.includes(p.category))].map(post => ({ schoolId: demoSchool, post })), reports: [], decisions: [] }))
  const latest = useRef(state)
  const commit = (next: ModerationState) => { latest.current = next; setState(next) }
  const actor = () => ({ id: session?.id || '', role: session?.role || '', schoolId: schoolFor(session), enabled: accounts.some(a => a.id === session?.id && a.role === session?.role && a.enabled) })
  const getPosts = (source: ModerationState, deleted = false) => {
    const user = actor()
    if (!user.enabled || !['student', 'admin'].includes(user.role)) return []
    return source.posts.filter(p => p.schoolId === user.schoolId && (!p.post.visibility || p.post.visibility === 'campus' || (user.role === 'student' && p.post.ownerId === user.id)) && source.decisions.some(d => d.postId === p.post.id && d.schoolId === user.schoolId && d.action === '删除') === deleted).map(({ post }) => ({ ...post, owned: post.ownerId === user.id }))
  }
  const updatePosts: CommunityOperations['setPosts'] = update => {
    const user = actor()
    if (!user.enabled || user.role !== 'student' || !user.schoolId) return
    const previous = getPosts(latest.current)
    const next = typeof update === 'function' ? update(previous) : update
    // Only student-owned posts may be removed; never resurrect moderator-deleted posts.
    const ownRemoved = new Set(previous.filter(p => p.ownerId === user.id && !next.some(n => n.id === p.id)).map(p => p.id))
    const entries = latest.current.posts.filter(p => p.schoolId !== user.schoolId || !ownRemoved.has(p.post.id)).map(entry => {
      if (entry.schoolId !== user.schoolId) return entry
      const replacement = next.find(p => p.id === entry.post.id)
      if (!replacement || latest.current.decisions.some(d => d.schoolId === user.schoolId && d.postId === entry.post.id && d.action === '删除')) return entry
      // A peer may add a comment, but cannot alter another author's post or prior comments.
      const post = entry.post.ownerId === user.id ? { ...replacement, ownerId: user.id } : { ...entry.post, comments: [...entry.post.comments, ...replacement.comments.filter(c => !entry.post.comments.some(old => old.id === c.id))] }
      return { ...entry, post }
    })
    for (const post of next) if (!latest.current.posts.some(p => p.post.id === post.id)) entries.push({ schoolId: user.schoolId, post: { ...post, ownerId: user.id } })
    commit({ ...latest.current, posts: entries })
  }
  const report: CommunityOperations['report'] = (postId, reason) => {
    const user = actor(); const result = submitPostReport(latest.current, user, { id: uid(), postId, schoolId: user.schoolId, reporterId: user.id, reason, time: nowLabel(), resolved: false })
    if (!result.error) commit(result.state)
    return result.error
  }
  const review: CommunityOperations['review'] = (postId, action, reason) => {
    const user = actor(); const result = reviewPost(latest.current, user, { id: uid(), postId, schoolId: user.schoolId, actorId: user.id, action, reason, time: nowLabel() })
    if (!result.error) { commit(result.state); log(`${action === '删除' ? '删除违规帖子' : '审核保留帖子'} ${postId}`) }
    return result.error
  }
  // SchoolGate may establish binding after this provider renders; resolve scope on consumption.
  const operations: CommunityOperations = {
    get posts() { return getPosts(state) }, setPosts: updatePosts, report, review,
    get deletedPosts() { return session?.role === 'admin' ? getPosts(state, true) : [] },
    get reports() { return state.reports.filter(r => r.schoolId === schoolFor(session) && (session?.role === 'admin' || r.reporterId === session?.id)) },
    get decisions() { return session?.role === 'admin' ? state.decisions.filter(d => d.schoolId === schoolFor(session)) : [] },
  }
  return <CommunityContext.Provider value={operations}>{children}</CommunityContext.Provider>
}
