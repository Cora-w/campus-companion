import { createContext, useContext } from 'react'
export const initialPeople = [
  { id: 'friend-lin', name: '小林', note: '下课一起去食堂吗？' },
  { id: 'friend-zhou', name: '周同学', note: '周末的摄影展，一起去看看。' },
  { id: 'author-1', name: '南门观察员', note: '来自校园墙 · 美食发现' },
  { id: 'author-2', name: '校园漫游', note: '来自校园墙 · 校园日常' },
  { id: 'author-3', name: '学姐的备忘录', note: '来自校园墙 · 新生指南' },
  { id: 'author-4', name: '周末不宅', note: '来自校园墙 · 活动搭子' },
  { id: 'author-5', name: '整理书架中', note: '来自校园墙 · 闲置互助' },
]

export const SocialContext = createContext({ people: initialPeople, contact: null as string | null, open: (_name: string) => { void _name }, close: () => {}, self: '' })
export const useSocial = () => useContext(SocialContext)

