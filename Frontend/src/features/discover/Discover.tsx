import { UserAvatar } from '../../components/shared/UserAvatar'
import { placePhotos } from './placePhotos'
import { useState } from 'react'
import { Button, Input, Rate } from 'antd'
import { campusPlaces } from '../../data/campusData'
import type { CampusPlace, CampusPost } from '../../data/campusData'
import { placeSlides } from './communityModel'
import { discoverReviews, discoverShops } from '../../data/discoverData'
import type { DiscoverReview } from '../../data/discoverData'
import { Icon, Sheet } from '../../components/shared/Shared'
import './Discover.css'

type Feedback = { liked: string[]; reviews: DiscoverReview[] }
function readFeedback(key: string): Feedback {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null')
    if (data && Array.isArray(data.liked) && data.liked.every((id: unknown) => typeof id === 'string') && Array.isArray(data.reviews) && data.reviews.every((r: DiscoverReview) => r && typeof r.id === 'string' && typeof r.target === 'string' && typeof r.author === 'string' && typeof r.text === 'string' && typeof r.rating === 'number' && typeof r.likes === 'number' && typeof r.time === 'string')) return data
  } catch { /* A fresh local session still works without storage. */ }
  return { liked: [], reviews: [] }
}
function Photo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="discover-photo">{failed ? <span>{name}</span> : <img src={src} alt={`${name}图片`} loading="lazy" onError={() => setFailed(true)}/>}</div>
}
export function Discover({ active, selectedId, select, account, name, saved, toggleSave, openPlace, placesData = campusPlaces, sharedPosts = [], likedPosts = [], createPlace }: { active: boolean; selectedId: string | null; select: (id: string | null) => void; account: string; name: string; saved: string[]; toggleSave: (id: string) => void; openPlace: (place: CampusPlace) => void; placesData?: CampusPlace[]; sharedPosts?: CampusPost[]; likedPosts?: string[]; createPlace?: () => void }) {
  const storageKey = 'campus-discover-feedback-v1:' + account
  const [feedback, updateFeedback] = useState(() => readFeedback(storageKey))
  const [storageError, setStorageError] = useState(false)
  const setFeedback = (update: (previous: Feedback) => Feedback) => {
    const next = update(feedback)
    updateFeedback(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false) } catch { setStorageError(true) }
  }
  const [kind, setKind] = useState('好吃')
  const [area, setArea] = useState('全部')
  const [category, setCategory] = useState('全部品类')
  const [outingCategory, setOutingCategory] = useState('全部去处')
  const [sort, setSort] = useState('人气优先')
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [reviewTab, setReviewTab] = useState('店铺评价')
  const [draft, setDraft] = useState('')
  const [rating, setRating] = useState(0)
  const [sent, setSent] = useState(false)
  const [composer, setComposer] = useState(false)
  const [reviewTarget, setReviewTarget] = useState('')
  const [reviewSort, setReviewSort] = useState('最新')
  const shop = discoverShops.find(s => s.id === selectedId)
  const product = shop?.products.find(p => p.id === productId)
  const target = product?.id || shop?.id || ''
  const reviewProduct = shop?.products.find(p => p.id === reviewTarget)
  const startReview = () => { resetDraft(); setReviewTarget(product?.id || (reviewTab === '商品评价' ? '' : shop?.id || '')); setComposer(true) }
  const allReviews = [...feedback.reviews, ...discoverReviews]
  const liked = (id: string) => feedback.liked.includes(id)
  const count = (id: string, base: number) => base + Number(liked(id))
  const toggleLike = (id: string) => setFeedback(prev => ({ ...prev, liked: prev.liked.includes(id) ? prev.liked.filter(x => x !== id) : [...prev.liked, id] }))
  const resetDraft = () => { setDraft(''); setRating(0); setSent(false) }
  const openShop = (id: string) => { setProductId(null); setReviewTab('店铺评价'); resetDraft(); select(id) }
  const close = () => { if (product) { setProductId(null); resetDraft() } else { select(null); resetDraft() } }
  const shops = discoverShops.filter(s => (area === '全部' || s.area === area) && (category === '全部品类' || s.category === category) && (s.name + s.address + s.products.map(p => p.name).join('')).includes(query.trim())).sort((a,b) => sort === '人均最低' ? a.price-b.price : count(b.id,b.likes)-count(a.id,a.likes))
  const places = placesData.filter(p => p.kind === '好玩' && (area === '全部' || p.area === area) && (outingCategory === '全部去处' || p.category === outingCategory) && (p.name + p.location).includes(query.trim()))
  const targetReviews = allReviews.filter(r => r.target === target || (!product && reviewTab === '商品评价' && shop?.products.some(p => p.id === r.target))).filter(r => product || reviewTab !== '商品评价' || r.target !== shop?.id).sort((a,b) => reviewSort === '最有帮助' ? count(b.id,b.likes)-count(a.id,a.likes) : 0)
  const shopReviews = allReviews.filter(r => r.target === shop?.id)
  const average = shopReviews.length ? (shopReviews.reduce((sum,r) => sum+r.rating,0)/shopReviews.length).toFixed(1) : '暂无'
  return <>
    <section className={`discover-page ${kind === '好玩' ? 'discover-play' : 'discover-food'}`} hidden={!active}>
      <div className="discover-heading"><div><h1>下课后的好时光</h1><p>{kind === '好吃' ? '吃一顿喜欢的，给今天加点滋味。' : '看一场展，散一会儿步，让日子慢下来。'}</p></div><span className="discover-campus"><Icon name="location"/>校园周边</span></div>
      <div className="discover-tabs">{['好吃','好玩'].map(k => <button key={k} aria-label={k} aria-pressed={kind === k} className={kind === k ? 'active' : ''} onClick={() => { setKind(k); setQuery(''); setCategory('全部品类'); setOutingCategory('全部去处') }}><Icon name={k === '好吃' ? 'food' : 'location'}/>{k}<small>{k === '好吃' ? '发现好店' : '探索去处'}</small></button>)}</div>
      <Input className="discover-search" prefix={<Icon name="search"/>} aria-label="搜索发现" placeholder={kind === '好吃' ? '搜店铺、想吃的菜、地址' : '搜地点、地址'} value={query} onChange={e => setQuery(e.target.value)} allowClear/>
      <div className="discover-filters"><div>{['全部','校内','周边'].map(a => <button key={a} aria-pressed={area === a} onClick={() => setArea(a)}>{a}</button>)}</div>{kind === '好吃' ? <select aria-label="店铺排序" value={sort} onChange={e => setSort(e.target.value)}><option>人气优先</option><option>人均最低</option></select> : <select aria-label="去处类型" value={outingCategory} onChange={e => setOutingCategory(e.target.value)}>{['全部去处',...new Set(placesData.filter(p => p.kind === '好玩').map(p => p.category))].map(c => <option key={c}>{c}</option>)}</select>}</div>
      {kind === '好吃' && <><div className="discover-categories">{['全部品类',...new Set(discoverShops.map(s => s.category))].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="discover-list-title"><h2>{sort === '人气优先' ? '同学爱去的店' : '实惠好店'}</h2><span>{shops.length} 家店 · 按{sort === '人气优先' ? '点赞数' : '人均价格'}排序</span></div><p className="discover-disclaimer">样例店铺与口碑 · 配图为 Unsplash 示意图</p>
      <div className="discover-shop-list">{shops.map((s,i) => <article className="discover-shop-card" key={s.id}><button className="discover-shop-main" onClick={() => openShop(s.id)} aria-label={`查看${s.name}`}><div className="discover-cover"><Photo src={s.image} name={s.name}/>{sort === '人气优先' && <span className="discover-rank">人气 NO.{i+1}</span>}</div><div className="discover-shop-info"><h3>{s.name}</h3><div className="discover-metrics"><b>{count(s.id,s.likes)} 人推荐</b><span>¥{s.price}/人</span></div><p>{s.area} · {s.category}</p><div className="discover-tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div><div className="discover-address"><Icon name="location"/><span>{s.address}</span></div></div></button><div className="discover-recommend"><span>招牌必点</span>{[...s.products].sort((a,b) => count(b.id,b.likes)-count(a.id,a.likes)).slice(0,2).map(p => <button key={p.id} onClick={() => { openShop(s.id); setProductId(p.id) }}>{p.name}<small> {count(p.id,p.likes)} 赞</small></button>)}</div><div className="discover-card-actions"><button aria-pressed={liked(s.id)} onClick={() => toggleLike(s.id)}><Icon name="like"/>{liked(s.id) ? '已推荐' : '推荐这家'}</button><button aria-pressed={saved.includes(s.id)} onClick={() => toggleSave(s.id)}><Icon name="bookmark"/>{saved.includes(s.id) ? '已收藏' : '收藏'}</button><button onClick={() => openShop(s.id)}>进店看看<Icon name="next"/></button></div></article>)}</div></>}
      {kind === '好玩' && <>
        {createPlace && <button className="discover-new-place" onClick={createPlace}><span><b>发现新地方？你也可以发布</b><small>创建地点，邀请同学一起分享</small></span><Icon name="plus"/></button>}
        <div className="outing-section-heading"><h2>给周末，换个风景</h2><small>{places.length} 个好去处</small></div>
        <div className="discover-outings">{places.map(p => <article className="outing-card" key={p.id}>
          <div className="outing-cover"><button className="outing-image-link" aria-label={`查看${p.name}`} onClick={() => openPlace(p)}>{(placeSlides(sharedPosts.filter(post => post.placeId === p.id),likedPosts)[0]?.src || placePhotos[p.id]?.[0]?.src) ? <Photo src={placeSlides(sharedPosts.filter(post => post.placeId === p.id),likedPosts)[0]?.src || placePhotos[p.id][0].src} name={p.name}/> : <div className="outing-photo-fallback"><Icon name="location"/></div>}</button><span className="outing-badge">{p.area} · {p.category}</span><button className="outing-save" aria-label={`${saved.includes(p.id) ? '取消收藏' : '收藏'}${p.name}`} aria-pressed={saved.includes(p.id)} onClick={() => toggleSave(p.id)}><Icon name="bookmark"/></button></div>
          <button className="outing-content" onClick={() => openPlace(p)}><h3>{p.name}</h3><small className="outing-contributions">{sharedPosts.filter(post => post.placeId===p.id).length} 篇同学分享</small><p className="outing-description">{p.desc}</p><div className="outing-location"><Icon name="location"/><span>{p.location.replace('（示例）','')}</span></div><div className="outing-card-bottom"><b>{p.price.split(' · ')[0]}</b><span>查看详情<Icon name="next"/></span></div></button>
        </article>)}</div>
        {!!places.length && <><div className="outing-note"><Icon name="bookmark"/><div><b>喜欢的地方，先收藏起来</b><p>在「我的收藏」里，留一份下次出发的清单。</p></div></div><p className="discover-disclaimer outing-source">地点及开放信息为校园样例 · 图片仅作场景示意</p></>}
      </>}
      {!(kind === '好吃' ? shops : places).length && <div className="empty"><p>没有找到匹配的{kind === '好吃' ? '店铺或商品' : '地点'}</p><Button onClick={() => { setQuery(''); setArea('全部'); setCategory('全部品类'); setOutingCategory('全部去处') }}>清除筛选</Button></div>}
    </section>
    <Sheet zIndex={1200} open={!!shop} onClose={close} title={product ? '商品详情' : '店铺详情'} footer={shop && <div className="discover-write-bar"><span>{product ? '这道好不好吃？' : '去过这家？聊聊你的体验'}<small>{product ? product.name : '可评价店铺，也可单独评价商品'}</small></span><Button type="primary" onClick={startReview}><Icon name="edit"/>写评价</Button></div>}>
      {shop && <div className="discover-detail">
        {product && <button className="discover-back" onClick={() => { setProductId(null); resetDraft() }}><Icon name="back"/>返回 {shop.name}</button>}
        <div className="discover-detail-cover"><Photo src={product?.image || shop.image} name={product?.name || shop.name}/><span>示意配图</span></div>
        <h2>{product?.name || shop.name}</h2>
        <div className="discover-detail-meta"><b>{product ? `¥${product.price} / 份` : `${average} 分 · ${shopReviews.length} 条店铺评价`}</b><span>{product ? `${count(product.id,product.likes)} 人推荐` : `人均 ¥${shop.price}`}</span></div>
        {product ? <p>{product.description}</p> : <div className="discover-location-box"><div><Icon name="location"/><div><b>{shop.address}</b><small>营业时间 {shop.hours}</small></div></div><small>虚构校园样例地址，暂不提供真实导航</small></div>}
        <div className="discover-detail-actions"><button aria-pressed={liked(target)} onClick={() => toggleLike(target)}><Icon name="like"/>{liked(target) ? '已点赞' : '点赞推荐'} · {count(target,product?.likes || shop.likes)}</button>{!product && <button aria-pressed={saved.includes(shop.id)} onClick={() => toggleSave(shop.id)}><Icon name="bookmark"/>{saved.includes(shop.id) ? '已收藏' : '收藏店铺'}</button>}</div>
        {!product && <><div className="discover-list-title"><h3>进店必点</h3><span>按商品点赞数排序</span></div><div className="discover-products">{[...shop.products].sort((a,b) => count(b.id,b.likes)-count(a.id,a.likes)).map((p,i) => <button key={p.id} onClick={() => { setProductId(p.id); resetDraft() }}><Photo src={p.image} name={p.name}/><div><small>TOP {i+1} · {count(p.id,p.likes)} 人推荐</small><h3>{p.name}</h3><p>{p.description}</p><b>¥{p.price}</b><span>详情 / 评价 →</span></div></button>)}</div><div className="discover-review-tabs">{['店铺评价','商品评价'].map(t => <button key={t} aria-pressed={reviewTab === t} onClick={() => { setReviewTab(t); resetDraft() }}>{t} <small>{allReviews.filter(r => t === '店铺评价' ? r.target === shop.id : shop.products.some(p => p.id === r.target)).length}</small></button>)}</div></>}
        <div className="discover-list-title"><h3>{product ? `${product.name}的评价` : '同学探店反馈'}</h3><select aria-label="评价排序" value={reviewSort} onChange={e => setReviewSort(e.target.value)}><option>最新</option><option>最有帮助</option></select></div>
        <div className="discover-reviews">{targetReviews.map(r => <article key={r.id}><div className="discover-review-author"><UserAvatar name={r.author}/><div><b>{r.author}</b><small>{r.time} · {r.rating} 分</small></div></div>{r.target !== shop.id && <button className="discover-review-product" onClick={() => { setProductId(r.target); resetDraft() }}>评价商品 · {shop.products.find(p => p.id === r.target)?.name}</button>}<p>{r.text}</p><button aria-label={`赞同${r.author}的评价`} aria-pressed={liked(r.id)} onClick={() => toggleLike(r.id)}><Icon name="like"/>有帮助 {count(r.id,r.likes)}</button></article>)}{!targetReviews.length && <p className="discover-no-reviews">还没有评价，来分享你的第一手体验吧。</p>}</div>
        {sent && <p className="discover-published" role="status">{storageError ? '评价已发布，仅本次体验保留。' : '评价已发布，保存在本机。'}</p>}
        <p className="discover-disclaimer">店铺、商品与初始评价均为演示样例。{storageError ? '本机存储不可用，新增点赞与评价仅在本次体验保留。' : '你的点赞与评价仅保存在当前浏览器，不会同步给其他同学。'}</p>
      </div>}
    </Sheet>
    <Sheet zIndex={1300} open={composer && !!shop} onClose={() => setComposer(false)} title="写探店评价">
      {shop && <form className="discover-review-form discover-composer" onSubmit={e => {
        e.preventDefault()
        if (!draft.trim() || !rating || !(reviewTarget === shop.id || reviewProduct)) return
        setFeedback(prev => ({ ...prev, reviews: [{ id:crypto.randomUUID(), target:reviewTarget, author:name, text:draft.trim(), rating, likes:0, time:'刚刚 · 本机评价' }, ...prev.reviews] }))
        setProductId(reviewProduct?.id || null)
        setReviewTab(reviewProduct ? '商品评价' : '店铺评价')
        setReviewSort('最新'); setComposer(false); setSent(true); setDraft(''); setRating(0)
      }}>
        <h3>{shop.name}</h3><label htmlFor="discover-review-target">评价对象</label>
        <select id="discover-review-target" value={reviewTarget} onChange={e => { setReviewTarget(e.target.value); setRating(0); setDraft('') }}>
          <option value="" disabled>请选择想评价的商品</option><option value={shop.id}>店铺整体体验</option>
          {shop.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p>{reviewTarget === shop.id ? '聊聊环境、服务、排队和整体体验。' : '聊聊口味、分量，给下一位同学一点建议。'}</p>
        <div><span>你的评分 </span><Rate aria-label="你的评分" value={rating} onChange={setRating}/></div>
        <Input.TextArea autoFocus aria-label="探店评价" placeholder="写下你的真实体验，给同学们一个参考…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} showCount rows={5}/>
        <Button type="primary" htmlType="submit" disabled={!draft.trim() || !rating || !reviewTarget}>发布评价</Button>
        <p className="discover-disclaimer">评价仅保存在当前浏览器，不会同步给其他同学。</p>
      </form>}
    </Sheet>
  </>
}

