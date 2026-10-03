import { UserAvatar } from '../../components/shared/UserAvatar'
import { PhotoAlbum } from '../../components/shared/PhotoAlbum'
import { useRef } from 'react'
import { Carousel } from 'antd'
import type { CarouselRef } from 'antd/es/carousel'
import type { CampusPlace, CampusPost } from '../../data/campusData'
import { placeHeat, placeSlides } from './communityModel'
import { Icon } from '../../components/shared/Shared'
import './PlaceCommunity.css'

export type PlaceView = { sort:'热门'|'最新'; photo?:string }
export function PlaceCommunity({ place, posts, liked, saved, toggleLike, toggleSave, openPost, share, view, updateView }: {
  view:PlaceView; updateView:(patch:Partial<PlaceView>)=>void
  place: CampusPlace; posts: CampusPost[]; liked: string[]; saved: string[]
  toggleLike: (id: string) => void; toggleSave: (id: string) => void
  openPost: (post: CampusPost) => void; share: () => void
}) {
  const { sort } = view
  const carousel = useRef<CarouselRef>(null)
  const stories = posts.filter(p => p.placeId === place.id)
  const slides = placeSlides(stories,liked)
  const slide = Math.max(0, slides.findIndex(item => item.src === view.photo))
  const ordered = sort === '热门' ? [...stories].sort((a,b) => placeHeat(b,liked)-placeHeat(a,liked)) : stories
  return <section className="place-community">
    {!!slides.length && <div className="place-community-carousel" aria-label="同学分享的热门照片">
      <Carousel ref={carousel} dots={slides.length>1} initialSlide={slide} afterChange={index => updateView({photo:slides[index]?.src})} infinite={slides.length>1} key={slides.map(s => s.src).join('|')}>
        {slides.map(({src,post}) => <div key={src}><button onClick={() => openPost(post)} aria-label={`查看照片来源：${post.title}`}><img src={src} alt={`${post.author}分享的${place.name}`} onError={e => { e.currentTarget.style.visibility='hidden' }}/><span className="place-photo-caption"><b>{post.title}</b><small>{post.author} · {post.likes+Number(liked.includes(post.id))} 赞{!post.owned && ' · 样例配图'}</small></span></button></div>)}
      </Carousel><span className="place-photo-count">{Math.min(slide+1,slides.length)} / {slides.length}</span>
      {slides.length>1 && <><button className="place-photo-prev" aria-label="上一张地点照片" onClick={() => carousel.current?.prev()}><Icon name="back"/></button><button className="place-photo-next" aria-label="下一张地点照片" onClick={() => carousel.current?.next()}><Icon name="next"/></button></>}
    </div>}
    <div className="place-community-summary"><div className="place-community-kicker">{place.area} · {place.category}<span>{stories.length} 篇同学分享</span></div><h1>{place.name}</h1><p>{place.desc}</p><div className="place-community-address"><Icon name="location"/><b>{place.location}</b></div><div className="place-community-facts"><span>{place.price}</span><span>{place.hours}</span></div></div>
    <div className="place-community-feed-heading"><div><h2>大家在这里</h2><small>每个人都能分享自己的发现</small></div><div>{(['热门','最新'] as const).map(s => <button key={s} aria-pressed={sort===s} onClick={() => updateView({sort:s})}>{s}</button>)}</div></div>
    {sort === '热门' && <p className="place-heat-note">按点赞 + 评论 × 2 排序 · 顶部轮播精选最多 6 张不重复照片</p>}
    <div className="place-community-feed">{ordered.map(post => <article className="place-story" key={post.id}>
      <div className="place-story-author"><UserAvatar name={post.author} anonymous={post.anonymous}>{post.anonymous ? '匿' : post.author.slice(0,1)}</UserAvatar><div><b>{post.author}</b><small>{post.time}</small></div></div>
      <button className="place-story-content" onClick={() => openPost(post)}><h3>{post.title}</h3><p>{post.text}</p></button><PhotoAlbum images={post.images} label={post.title}/>
      {!post.owned && post.images.length>0 && <small className="place-story-credit">样例分享 · 示意配图，非同学实拍</small>}
      {!!post.comments.length && <button className="place-story-reply" onClick={() => openPost(post)}><b>{post.comments[0].author}：</b>{post.comments[0].text}</button>}
      <div className="place-story-actions"><button aria-label={`点赞${post.title}`} aria-pressed={liked.includes(post.id)} onClick={() => toggleLike(post.id)}><Icon name="like"/>{post.likes+Number(liked.includes(post.id))}</button><button onClick={() => openPost(post)}><Icon name="chat"/>{post.comments.length || '评论'}</button><button aria-label={`收藏${post.title}`} aria-pressed={saved.includes(post.id)} onClick={() => toggleSave(post.id)}><Icon name="bookmark"/>{saved.includes(post.id) ? '已收藏' : '收藏'}</button></div>
    </article>)}</div>
    {!stories.length && <div className="place-community-empty"><h3>这里的第一篇分享，由你开始</h3><p>写下你的经历，照片也会进入这个地点的相册。</p><button onClick={share}>分享这里 <Icon name="plus"/></button></div>}
    {!!stories.length && <button className="place-community-invite" onClick={share}><Icon name="edit"/><span>你也来过这里吗？<small>把你的照片和体验，加入这份共同记录。</small></span><Icon name="next"/></button>}
  </section>
}

