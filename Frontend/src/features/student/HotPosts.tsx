import { useCommerce } from '../commerce/commerce'
import { useEffect, useState } from 'react'
import type { CampusPost } from '../../data/campusData'
import { Icon } from '../../components/shared/Shared'

export function HotPosts({ posts, openPost, blocked, openShop }: { posts: CampusPost[]; openPost: (post: CampusPost) => void; blocked: boolean; openShop: (id: string) => void }) {
  const { promotion, shops } = useCommerce()
  const store = shops.find(s=>s.id==='afterclass')!
  const [index, setIndex] = useState(0)
  const count = Math.max(1, posts.length + Number(promotion.enabled))
  const current = index % count
  useEffect(() => {
    if (blocked || count < 2) return
    const timer = setInterval(() => { if (!document.hidden) setIndex(prev => (prev + 1) % count) }, 4000)
    return () => clearInterval(timer)
  }, [blocked, count])
  const post = posts[current]
  const promoted = !post
  return <section className="hot-posts" aria-label="校园精选与商家推广轮播" aria-roledescription="轮播">
    <button className={`freshman-banner hot-post-card ${promoted ? 'merchant-promotion' : ''}`} onClick={() => promoted ? openShop('afterclass') : openPost(post)} aria-label={promoted ? `查看商家推广：${store.name}` : `查看热门帖子：${post.title}`}><span className="hot-post-copy"><small>{promoted ? '广告 · 商家推广（演示位）' : `同学们都在看 / ${post.category}`}</small><b>{promoted ? promotion.title : post.title}</b><em>{promoted ? `${store.name} · 点击进店选购` : `${post.author} · ${post.likes} 人点赞`} <Icon name="next"/></em></span><span className="feature-number" aria-hidden="true">{promoted ? 'SHOP' : String(current + 1).padStart(2, '0')}<span>{promoted ? <>CAMPUS<br/>SNACKS</> : <>CAMPUS<br/>POPULAR</>}</span></span></button>
    <div className="hot-post-controls"><span>{current + 1} / {count}</span><div>{Array.from({ length: count }, (_, i) => <button key={i} aria-label={i === posts.length ? '查看商家推广' : `查看第${i + 1}条热门帖子`} aria-current={i === current ? 'true' : undefined} onClick={() => setIndex(i)}><i/></button>)}</div></div>
  </section>
}

