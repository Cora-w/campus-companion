import type { CampusPost } from '../../data/campusData.ts'
export const footprintFilters = ['浏览过', '赞过', '收藏过', '评论过'] as const
export type FootprintFilter = typeof footprintFilters[number]
export function footprintPosts(posts: CampusPost[], filter: FootprintFilter, userId: string, history: string[], liked: string[], saved: string[]): CampusPost[] {
  if (filter === '浏览过') return history.map(id => posts.find(p => p.id === id)).filter((p): p is CampusPost => !!p)
  return posts.filter(p => filter === '赞过' ? liked.includes(p.id) : filter === '收藏过' ? saved.includes(p.id) : p.comments.some(c => c.authorId === userId))
}
