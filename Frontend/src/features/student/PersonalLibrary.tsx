import { Button, Input } from 'antd'
import { Icon } from '../../components/shared/Shared'
import { libraryCategories } from './libraryModel'
import type { LibraryCategory, LibraryEntry } from './libraryModel'
import './PersonalLibrary.css'

export type LibraryMode = 'collection' | 'liked' | 'history'
export type LibraryView = { category: LibraryCategory; query: string }
export function PersonalLibrary({ entries, mode, view, updateView, open, browse }: { entries: LibraryEntry[]; mode: LibraryMode; view: LibraryView; updateView: (view: LibraryView) => void; open: (entry: LibraryEntry) => void; browse: (category: LibraryCategory) => void }) {
  const { category, query } = view
  const setCategory = (category: LibraryCategory) => updateView({ category, query })
  const setQuery = (query: string) => updateView({ category, query })
  const categories = mode === 'liked' ? libraryCategories : libraryCategories.filter(c => c !== '评价')
  const visible = entries.filter(e => (category === '全部' || e.category === category) && `${e.title} ${e.detail}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const action = mode === 'collection' ? '收藏' : mode === 'liked' ? '点赞' : '浏览'
  return <section className="personal-library">
    <nav className="library-categories" style={{ gridTemplateColumns:`repeat(${categories.length}, minmax(0,1fr))` }} aria-label={`${action}内容分类`}>{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}<small>{c === '全部' ? entries.length : entries.filter(e => e.category === c).length}</small></button>)}</nav>
    <Input className="library-search" aria-label={`搜索${action}记录`} prefix={<Icon name="search"/>} placeholder="搜索标题、地点或店铺" allowClear value={query} onChange={e => setQuery(e.target.value)}/>
    <p className="library-count">{mode === 'history' ? '最近浏览' : `已${action}`} · {visible.length} 条{category !== '全部' && ` · ${category}`}</p>
    <div className="library-list">{visible.map(e => <button key={e.id} onClick={() => open(e)}><span className="library-kind"><Icon name={e.category === '帖子' || e.category === '评价' ? 'chat' : e.category === '地点' ? 'location' : 'food'}/></span><span className="library-copy"><small>{e.category}</small><b>{e.title}</b><span>{e.detail}</span></span></button>)}</div>
    {!visible.length && <div className="library-empty"><Icon name={mode === 'collection' ? 'bookmark' : mode === 'liked' ? 'like' : 'report'}/><h3>{query.trim() ? '没有找到匹配的记录' : `还没有${category === '全部' ? '' : category}${action}记录`}</h3><p>{query.trim() ? '换个关键词，或查看其他分类。' : `遇到喜欢的内容，${mode === 'history' ? '打开后会记录在这里。' : `${action}后就能在这里找到。`}`}</p>{query.trim() ? <Button onClick={() => setQuery('')}>清除搜索</Button> : <Button onClick={() => browse(category)}>{category === '美食' || category === '店铺' || category === '评价' ? '去发现美食' : category === '地点' ? '去发现地点' : '去校园墙逛逛'}</Button>}</div>}
  </section>
}
