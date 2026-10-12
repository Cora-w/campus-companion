import { PhotoAlbum } from '../../components/shared/PhotoAlbum'
import { visibilityLabel } from './postVisibility'
import type { PostVisibility } from './postVisibility'
import { PlaceCommunity } from '../discover/PlaceCommunity'
import type { PlaceView } from '../discover/PlaceCommunity'
import { useCommunity } from '../moderation/CommunityContext'
import { PublishComposer } from './PublishComposer'
import { placePhotos } from '../discover/placePhotos'
import { Discover } from '../discover/Discover'
import { discoverShops } from '../../data/discoverData'
import { StudentProfile } from './StudentProfile'
import { useCommerce } from '../commerce/commerce'
import './StudentRefinements.css'
import { SnackShops } from '../commerce/SnackShops'
import { SocialContext, initialPeople } from '../messages/socialContext'
import { UserAvatar } from '../../components/shared/UserAvatar'
import { useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Input, Select, Tag, message } from 'antd'
import type { InputRef } from 'antd'
import type { Session } from '../../data/data'
import { uid } from '../../data/data'
import { campusPlaces, categories } from '../../data/campusData'
import type { CampusPlace, CampusPost } from '../../data/campusData'
import { CampusHub } from '../campus/CampusHub'
import type { HubPage, SupportRequest } from '../../data/hubData'
import { HotPosts } from './HotPosts'
import type { HubConversation } from '../messages/HubSocial'
import { Messenger } from '../messages/Messenger'

import { Icon, Sheet } from '../../components/shared/Shared'


export type StudentPage = 'home' | 'services' | 'publish' | 'chat' | 'profile'
type Panel = 'search' | 'categories' | 'post' | 'place' | 'privacy' | 'support' | 'collection' | 'my-posts' | 'history' | 'identity' | 'nickname' | 'report' | 'liked' | null
const wallCategories = categories.filter(c => !['新生指南', '闲置互助', '活动搭子', '匿名树洞'].includes(c))
function StudentContent({ page, go, session, logout, requests, requestSupport, openInvitations, invitationCount }: { openInvitations: () => void; invitationCount: number; page: StudentPage; go: (page: StudentPage) => void; session: Session; logout: () => void; requests: SupportRequest[]; requestSupport: (topic: string) => void }) {
  const { posts, setPosts, report, reports } = useCommunity()
  const [placeViews, setPlaceViews] = useState<Record<string,PlaceView>>({})
  const [allPlaces, setAllPlaces] = useState<CampusPlace[]>(campusPlaces)
  const [draftPlaceId, setDraftPlaceId] = useState('')
  const [newPlaceName, setNewPlaceName] = useState('')
  const [newPlaceAddress, setNewPlaceAddress] = useState('')
  const [newPlaceArea, setNewPlaceArea] = useState<'校内' | '周边'>('校内')
  const [newPlaceCategory, setNewPlaceCategory] = useState('散步')
  const [serviceThreads, setServiceThreads] = useState<HubConversation[]>([])
  const [activeService, setActiveService] = useState<HubConversation|null>(null)
  const [serviceAccess, setServiceAccess] = useState<Record<string,boolean>>({})
  const openService = (thread:HubConversation) => { setServiceThreads(prev=>[thread,...prev.filter(t=>t.id!==thread.id)]); setActiveService(thread) }
  const [snacksOpen, setSnacksOpen] = useState(false)
  const [snackShopId, setSnackShopId] = useState<string | null>(null)
  const [hub, setHub] = useState<HubPage | null>(null)
  const [category, setCategory] = useState('全部')
  const [sort, setSort] = useState('推荐')
  const feedRef = useRef<HTMLDivElement>(null)
  const previousSelection = useRef({ category, sort })
  useLayoutEffect(() => {
    if (previousSelection.current.category === category && previousSelection.current.sort === sort) return
    previousSelection.current = { category, sort }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = feedRef.current?.animate(
      [{ opacity: .92, transform: 'translateY(1px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 140, easing: 'ease-out' },
    )
    return () => animation?.cancel()
  }, [category, sort])
  const categoryKey = 'campus-home-categories:' + session.id
  const [homeCategories, setHomeCategories] = useState<string[]>(() => {
    try { const stored: unknown = JSON.parse(localStorage.getItem(categoryKey) || 'null'); if (Array.isArray(stored)) return wallCategories.filter(c => c !== '全部' && stored.includes(c)) } catch { /* Use defaults when storage is unavailable. */ }
    return ['校园日常', '美食发现']
  })
  const [draftCategories, setDraftCategories] = useState<string[]>(homeCategories)
  const saveCategories = () => {
    setHomeCategories(draftCategories)
    if (category !== '全部' && !draftCategories.includes(category)) setCategory('全部')
    try { localStorage.setItem(categoryKey, JSON.stringify(draftCategories)) } catch { /* Preferences still work for this session. */ }
    setPanel(null)
  }
  const [search, setSearch] = useState('')
  const { shops } = useCommerce()
  const serviceEntries = [{name:'校园指南',words:'课表 教室 老师 办公室 地图 通知 四六级',key:'guide'},{name:'校园闲置',words:'二手 买卖 教材',key:'market'},{name:'活动搭子',words:'活动 报名 组队 比赛',key:'activities'},{name:'倾诉空间',words:'倾诉 吐槽 倾听',key:'listen'}] as const
  const [liked, setLiked] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const detailStack = useRef<{ panel:Panel; postId:string; place:CampusPlace|null; comment:string; scroll:number }[]>([])
  const pendingScroll = useRef<number|null>(null)
  const detailBody = useRef<HTMLDivElement>(null)
  const pushDetail = () => {
    if (panel !== 'post' && panel !== 'place') detailStack.current = []
    detailStack.current.push({panel,postId:selectedPostId,place:selectedPlace,comment,scroll:detailBody.current?.closest('.ant-drawer-body')?.scrollTop || 0})
    pendingScroll.current = 0
  }
  const closePanel = () => {
    if (panel === 'report') { setPanel('post'); return }
    const previous = panel === 'post' || panel === 'place' ? detailStack.current.pop() : undefined
    if (previous) {
      setSelectedPostId(previous.postId); setSelectedPlace(previous.place); setComment(previous.comment)
      pendingScroll.current = previous.scroll; setPanel(previous.panel)
    } else { detailStack.current = []; setPanel(null) }
  }
  const [selectedPostId, setSelectedPostId] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<CampusPlace | null>(null)
  const [comment, setComment] = useState('')
  useLayoutEffect(() => {
    const body = detailBody.current?.closest('.ant-drawer-body')
    if (body && pendingScroll.current !== null) { body.scrollTop = pendingScroll.current; pendingScroll.current = null }
  }, [panel,selectedPostId,selectedPlace])
  const [discoverId, setDiscoverId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [postCategory, setPostCategory] = useState('校园日常')
  const [location, setLocation] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [visibility, setVisibility] = useState<PostVisibility>('campus')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  const [feedbackApi, feedbackHolder] = message.useMessage()
  const setNotice = (content: string) => { void feedbackApi.open({ key: 'campus-feedback', content, icon: <Icon name="check"/>, duration: 3, className: 'campus-feedback-toast' }) }
  const [profileIdentity, setProfileIdentity] = useState({ avatar: '', realName: '', studentNumber: '', schoolDetails: { college: '', major: '', grade: '', className: '' } })
  const [nickname, setNickname] = useState(session.name)
  const [nicknameDraft, setNicknameDraft] = useState(session.name)
  const [contact, setContact] = useState<string | null>(null)
  const [supportSent, setSupportSent] = useState(false)
  const [supportConsent, setSupportConsent] = useState(false)
  const [reason, setReason] = useState('想预约一次谈话')
  const [reportReason, setReportReason] = useState('不友善或冒犯内容')
  const reported = reports.map(r => r.postId)
  const commentInput = useRef<InputRef>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const currentPost = posts.find(p => p.id === selectedPostId)
  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id]
  const openPost = (p: CampusPost) => { pushDetail(); setSelectedPostId(p.id); setHistory(prev => [p.id, ...prev.filter(id => id !== p.id)]); setComment(''); setPanel('post') }
  const openPlace = (p: CampusPlace) => { if (discoverShops.some(s => s.id === p.id)) { setDiscoverId(p.id); return } pushDetail(); setSelectedPlace(p); setPanel('place') }
  const browse = (next: string) => { setCategory(next); setSearch(''); go('home') }
  const startPost = (next = '校园日常') => { if (!title.trim() && !text.trim() && !images.length) setPostCategory(next); setPanel(null); go('publish') }
  const sharePlace = (place?: CampusPlace) => {
    setDraftPlaceId(place?.id || '__new__'); setLocation(place?.location || location)
    setPanel(null); setFormError(''); go('publish')
  }
  const publish = () => {
    if (uploading) return
    if (!title.trim() || !text.trim()) { setFormError('请填写标题和分享内容。'); return }
    if (visibility === 'campus' && draftPlaceId === '__new__' && (!newPlaceName.trim() || !newPlaceAddress.trim())) { setFormError('请填写新地点的名称和具体地址。'); return }
    const normalize = (value: string) => value.trim().replace(/\s+/g, '').toLowerCase()
    const duplicate = visibility === 'campus' && draftPlaceId === '__new__' ? allPlaces.find(p => p.kind === '好玩' && normalize(p.name) === normalize(newPlaceName) && normalize(p.location) === normalize(newPlaceAddress)) : undefined
    const created: CampusPlace | undefined = visibility === 'campus' && draftPlaceId === '__new__' && !duplicate ? { id:'community-place-' + uid(), name:newPlaceName.trim(), kind:'好玩', area:newPlaceArea, category:newPlaceCategory, desc:'由同学首次分享，一起记录这里的体验。', location:newPlaceAddress.trim(), price:'费用待同学补充', hours:'开放信息待核实', cover:'campus' } : undefined
    const linkedPlace = visibility !== 'campus' ? undefined : created || duplicate || allPlaces.find(p => p.id === draftPlaceId) || (!draftPlaceId && location.trim() ? allPlaces.find(p => p.kind === '好玩' && (p.name === location.trim() || p.location === location.trim())) : undefined)
    if (created) setAllPlaces(prev => [...prev,created])
    const isAnonymous = anonymous || postCategory === '匿名树洞'
    setPosts(prev => [{ id:uid(), placeId:linkedPlace?.id, author:isAnonymous ? '匿名同学' : nickname, category:postCategory, title:title.trim(), text:text.trim(), location:linkedPlace?.location || location.trim(), time:'刚刚 · 本次演示', likes:0, comments:[], images, visibility, owned:true, anonymous:isAnonymous }, ...prev])
    setTitle(''); setText(''); setImages([]); setLocation(''); setAnonymous(false); setCategory('全部'); setSearch(''); setSort('最新'); setFormError(''); setDraftPlaceId(''); setNewPlaceName(''); setNewPlaceAddress(''); setVisibility('campus')
    if (linkedPlace) { setNotice('已同步到校园墙与地点页，本次演示刷新后重置。'); setSelectedPlace(linkedPlace); detailStack.current=[]; setPanel('place'); go('services') }
    else { setNotice(visibility === 'campus' ? '已发布到本次演示校园墙，刷新后重置。' : '已保存到我的发布 · ' + visibilityLabel(visibility)); if (visibility === 'campus') go('home'); else { go('profile'); setPanel('my-posts') } }
  }
  const addImages = async (files: FileList | null) => {
    if (!files?.length || uploading) return
    const selected = Array.from(files)
    if (fileInput.current) fileInput.current.value = ''
    if (images.length + selected.length > 6) { setFormError('每条动态最多添加 6 张图片。'); return }
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setFormError('请选择 JPG、PNG 或 WebP 图片，每张不超过 5MB。'); return }
    setUploading(true); setFormError('')
    try {
      const urls = await Promise.all(selected.map(file => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('读取失败')); reader.onload = async () => { const url = String(reader.result); const image = new Image(); image.src = url; try { await image.decode(); resolve(url) } catch { reject(new Error('无效图片')) } }; reader.readAsDataURL(file) })))
      setImages(prev => [...prev, ...urls].slice(0, 6))
    } catch { setFormError('有图片无法读取，请重新选择。') } finally { setUploading(false); if (fileInput.current) fileInput.current.value = '' }
  }
  const visiblePosts = posts.filter(p => (!p.visibility || p.visibility === 'campus') && (category === '全部' || p.category === category))
  const featuredPosts = posts.filter(p => !p.visibility || p.visibility === 'campus').map(p=>({...p,likes:p.likes+Number(liked.includes(p.id))})).sort((a,b)=>b.likes-a.likes||b.comments.length-a.comments.length).slice(0,3)
  const featuredIds = new Set(featuredPosts.map(p=>p.id))
  const orderedPosts = sort === '推荐' ? [...visiblePosts.filter(p=>!featuredIds.has(p.id)),...visiblePosts.filter(p=>featuredIds.has(p.id))] : sort === '热门' ? [...visiblePosts].sort((a, b) => (b.likes + Number(liked.includes(b.id))) - (a.likes + Number(liked.includes(a.id)))) : visiblePosts
  const postCard = (p: CampusPost) => <article className="wall-post" key={p.id}>
    <div className="row"><div className="wall-author"><UserAvatar name={p.author} anonymous={p.anonymous || p.owned}>{p.owned && !p.anonymous && profileIdentity.avatar ? <img className="profile-owned-avatar" src={profileIdentity.avatar} alt="我的头像"/> : p.anonymous ? '匿' : p.author.slice(0, 1)}</UserAvatar><div><b>{p.author}</b><small>{p.time}</small></div></div><button className="post-category" onClick={() => { setPanel(null); browse(p.category) }}>{p.category}</button></div>
    <button className="post-body-button" onClick={() => openPost(p)}><h2>{p.title}</h2><p>{p.text}</p></button>{p.images.length > 0 && <PhotoAlbum images={p.images} label={p.title}/>}{!p.owned&&p.images.length>0&&<small className="sample-photo-credit">示意配图 · Unsplash，非同学实拍</small>}
    {p.location && <button className="post-location" onClick={() => { const place=allPlaces.find(x => x.id===p.placeId); if(place) openPlace(place) }}><Icon name="location"/>{allPlaces.find(x => x.id===p.placeId)?.name || p.location}</button>}
    {p.comments.length>0&&<button className="post-comment-preview" onClick={()=>openPost(p)}><b>{p.comments[0].author}：</b>{p.comments[0].text}<span>查看讨论</span></button>}<div className="wall-actions"><button aria-label={`点赞${p.title}`} aria-pressed={liked.includes(p.id)} onClick={() => setLiked(toggle(liked, p.id))}><Icon name="like"/>{p.likes + Number(liked.includes(p.id))}</button><button aria-label={`评论${p.title}`} onClick={() => openPost(p)}><Icon name="chat"/>{p.comments.length || '评论'}</button><button aria-label={`收藏${p.title}`} aria-pressed={saved.includes(p.id)} onClick={() => setSaved(toggle(saved, p.id))}><Icon name="bookmark"/>{saved.includes(p.id) ? '已收藏' : '收藏'}</button></div>
  </article>
  return <>
    {feedbackHolder}
    {page === 'home' && <>
      <Input className="campus-search" aria-label="搜索校园内容" placeholder="搜帖子、店铺、地点与服务" readOnly onClick={()=>setPanel('search')} prefix={<Icon name="search"/>} allowClear/>
      {<HotPosts openShop={id => { setSnackShopId(id); setSnacksOpen(true) }} blocked={panel !== null || hub !== null || snacksOpen} posts={featuredPosts} openPost={openPost}/>}
      <div className="campus-hub-entries"><button onClick={() => { setSnackShopId(null); setSnacksOpen(true) }}><Icon name="food"/><span>零食铺子</span></button>{([['guide','校园指南','location'],['market','校园闲置','bookmark'],['activities','活动搭子','users'],['listen','倾诉空间','chat']] as const).map(([key,label,icon])=><button key={key} onClick={()=>setHub(key)}><Icon name={icon}/><span>{label}</span></button>)}</div>
      <div className="wall-sort"><div>{['推荐', '最新', '热门'].map(s => <button key={s} className={sort === s ? 'active' : ''} onClick={() => setSort(s)}>{s}</button>)}</div><button className="share-daily-entry" onClick={() => startPost()}>分享日常 <Icon name="plus"/></button></div>
      <div className="category-navigation"><button className="category-manage" aria-label="管理首页分类" onClick={() => { setDraftCategories(homeCategories); setPanel('categories') }}><Icon name="categories"/></button><div className="wall-categories">{['全部', ...homeCategories].map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
      <div ref={feedRef} className="wall-feed">{orderedPosts.map(postCard)}</div>{!orderedPosts.length && <div className="empty"><p>还没有找到相关内容</p><Button onClick={() => { setSearch(''); setCategory('全部') }}>查看全部动态</Button></div>}
      <button className="companion-entry" onClick={() => go('chat')}><span><b>找校园信息，也可以找小心</b><small>问吃喝玩乐，或聊聊今天的事</small></span><Icon name="chat"/></button>
      {panel === null && hub === null && !snacksOpen && <button className="wall-refresh-top" aria-label="刷新论坛并回到顶部" title="刷新并回到顶部" onClick={() => { setPosts(prev => [...prev]); setNotice('已刷新校园墙'); window.scrollTo({ top: 0, behavior: 'instant' }) }}><Icon name="refresh"/></button>}
    </>}
    <Discover placesData={allPlaces} sharedPosts={posts.filter(p => !p.visibility || p.visibility === 'campus')} likedPosts={liked} createPlace={() => sharePlace()} active={page === 'services'} selectedId={discoverId} select={setDiscoverId} account={session.id} name={nickname} saved={saved} toggleSave={id => setSaved(prev => toggle(prev, id))} openPlace={openPlace}/>
    {page === 'publish' && <PublishComposer visibility={visibility} setVisibility={setVisibility} placeLink={<div className="place-link-field"><label htmlFor="post-place-link">分享到发现地点</label><Select id="post-place-link" aria-label="分享到发现地点" value={draftPlaceId} onChange={value => { setDraftPlaceId(value); const p=allPlaces.find(p => p.id === value); if(p) setLocation(p.location) }} options={[{ value:'', label:'不关联地点' }, ...allPlaces.filter(p => p.kind === '好玩').map(p => ({ value:p.id, label:p.name + ' · ' + p.area })), { value:'__new__', label:'＋ 新增地点，发布第一篇分享' }]}/>{draftPlaceId === '__new__' && <div className="place-new-fields"><label>地点名称<Input aria-label="新地点名称" maxLength={40} value={newPlaceName} onChange={e => setNewPlaceName(e.target.value)} placeholder="例如：北门小花园"/></label><label>具体地址<Input aria-label="新地点地址" maxLength={100} value={newPlaceAddress} onChange={e => setNewPlaceAddress(e.target.value)} placeholder="楼栋、楼层或街道，让同学找得到"/></label><label>范围<Select aria-label="新地点范围" value={newPlaceArea} onChange={setNewPlaceArea} options={['校内','周边'].map(value => ({ value:value as '校内' | '周边', label:value }))}/></label><label>类型<Select aria-label="新地点类型" value={newPlaceCategory} onChange={setNewPlaceCategory} options={['散步','展览','运动','休闲','其他'].map(value => ({ value, label:value }))}/></label></div>}<p>{visibility !== 'campus' ? '好友可见或私密记录不会进入公开地点页；切换为校园内同学可见后才能参与地点分享。' : draftPlaceId ? '发布后同步出现在校园墙和地点页，照片参与地点热门轮播。' : '选择已有地点，或由你创建地点的第一篇分享。'}</p></div>} title={title} text={text} category={postCategory} location={location} anonymous={anonymous} images={images} uploading={uploading} error={formError} categories={wallCategories.slice(1)} name={nickname} fileInput={fileInput} setTitle={setTitle} setText={setText} setCategory={setPostCategory} setLocation={setLocation} setAnonymous={setAnonymous} setImages={setImages} addImages={addImages} publish={publish} leave={() => { setNotice('草稿已保留，可从发布页或我的草稿箱继续编辑；刷新或退出后清空。'); window.campusBack?.() }}/>}
    <SnackShops open={snacksOpen} shopId={snackShopId} selectShop={setSnackShopId} close={() => setSnacksOpen(false)}/>
    <CampusHub onConversation={openService} onAccess={setServiceAccess} page={hub} close={() => setHub(null)} session={session} requests={requests} requestSupport={requestSupport}/>
    <Messenger serviceThreads={serviceThreads} activeService={activeService} openService={openService} closeService={()=>setActiveService(null)} serviceAccess={serviceAccess} active={page === 'chat'} contact={contact} clearContact={() => setContact(null)}/>
    <div hidden={page !== 'profile'}><StudentProfile openInvitations={openInvitations} invitationCount={invitationCount} {...profileIdentity} saveIdentity={(avatar, realName, studentNumber, schoolDetails) => setProfileIdentity({ avatar, realName, studentNumber, schoolDetails })} name={nickname} account={session.id} counts={[posts.filter(p => p.owned).length, saved.length, posts.filter(p => liked.includes(p.id)).length, posts.filter(p => history.includes(p.id)).length]} hasDraft={!!(title.trim() || text.trim() || images.length || location || anonymous || visibility !== 'campus')} open={target => { if (target === 'categories') setDraftCategories(homeCategories); setPanel(target) }} rename={name => { setNickname(name); setPosts(prev => prev.map(p => p.owned && !p.anonymous ? { ...p, author: name } : p)) }} publish={() => go('publish')} shop={() => { setSnackShopId(null); setSnacksOpen(true) }} logout={() => { setPosts(prev => prev.filter(p => !p.owned || !p.visibility || p.visibility === 'campus')); logout() }} clearHistory={() => setHistory([])}/></div>
    <Sheet compact={panel === 'report'} zIndex={panel === 'identity' ? 1100 : undefined} fullScreen={selectedPlace?.kind === '好玩' && (panel === 'place' || ((panel === 'post' || panel === 'report') && currentPost?.placeId === selectedPlace.id))} footer={panel === 'place' && selectedPlace?.kind === '好玩' ? <div className="place-community-bar"><button aria-pressed={saved.includes(selectedPlace.id)} onClick={() => setSaved(prev => toggle(prev,selectedPlace.id))}><Icon name="bookmark"/>{saved.includes(selectedPlace.id) ? '已收藏' : '收藏地点'}</button><Button type="primary" onClick={() => sharePlace(selectedPlace)}><Icon name="edit"/>分享这里</Button></div> : undefined} open={panel !== null} onClose={closePanel} title={panel === 'liked' ? '我赞过的' : panel === 'search' ? '搜索校园' : panel === 'categories' ? '我的首页分类' : panel === 'post' ? '帖子详情' : panel === 'place' ? (selectedPlace?.kind === '好玩' ? '地点 · 同学共创' : '地点与指南') : panel === 'privacy' ? '隐私与数据用途' : panel === 'support' ? '联系心理老师' : panel === 'collection' ? '我的收藏' : panel === 'my-posts' ? '我的发布' : panel === 'history' ? '浏览足迹' : panel === 'nickname' ? '编辑昵称' : panel === 'report' ? '举报动态' : '学校详情'}>
      <div ref={detailBody}/>
      {panel === 'search' && <div className="campus-unified-search"><Input autoFocus aria-label="校园搜索关键词" value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索帖子、店铺、地点或服务" allowClear/>{!search.trim()?<p className="subtle">试试“食堂”“零食”“教室”或“活动”。</p>:<>{[{title:'同学帖子',rows:posts.filter(p=>(p.title+p.text+p.author+p.location).includes(search.trim())).map(p=>({id:p.id,title:p.title,subtitle:p.author+' · '+p.category,open:()=>openPost(p)}))},{title:'店铺',rows:shops.filter(s=>s.isOpen!==false&&(s.name+s.products.filter(p=>p.active!==false).map(p=>p.name).join('')).includes(search.trim())).map(s=>({id:s.id,title:s.name,subtitle:s.location,open:()=>{setSnackShopId(s.id);setSnacksOpen(true)}}))},{title:'地点',rows:allPlaces.filter(p=>(p.name+p.desc+p.location).includes(search.trim())).map(p=>({id:p.id,title:p.name,subtitle:p.location,open:()=>openPlace(p)}))},{title:'校园服务',rows:serviceEntries.filter(e=>(e.name+e.words).includes(search.trim())).map(e=>({id:e.key,title:e.name,subtitle:e.key==='guide'?'查课表、找地点、看通知':'进入'+e.name,open:()=>{setHub(e.key)}}))}].map(group=><section key={group.title}><h3>{group.title} <small>{group.rows.length}</small></h3>{group.rows.length?group.rows.map(r=><button className="search-result-row" key={r.id} onClick={r.open}><b>{r.title}</b><span>{r.subtitle}</span><Icon name="next"/></button>):<p className="search-empty">暂无相关{group.title}</p>}</section>)}</>}</div>}
      {panel === 'categories' && <div className="category-settings"><p>选中你想常看的类型，显示在首页分类栏。</p><div className="category-fixed"><b>全部</b><span>固定保留，浏览所有类型的帖子</span></div><div className="category-choices">{wallCategories.slice(1).map(c => <Checkbox key={c} checked={draftCategories.includes(c)} onChange={e => setDraftCategories(prev => e.target.checked ? [...prev, c] : prev.filter(x => x !== c))}>{c}</Checkbox>)}</div><p className="subtle">取消勾选只收起分类入口，帖子仍可在“全部”中查看。</p><Button type="primary" block onClick={saveCategories}>保存分类</Button></div>}
      {panel === 'post' && currentPost && <article className="post-detail">
        <header className="row"><div className="wall-author"><UserAvatar name={currentPost.author} anonymous={currentPost.anonymous || currentPost.owned}>{currentPost.owned && !currentPost.anonymous && profileIdentity.avatar ? <img className="profile-owned-avatar" src={profileIdentity.avatar} alt="我的头像"/> : currentPost.anonymous ? '匿' : currentPost.author.slice(0, 1)}</UserAvatar><div><b>{currentPost.author}</b><small>{currentPost.time}{currentPost.owned && ` · ${visibilityLabel(currentPost.visibility)}`}</small></div></div><Tag>{currentPost.category}</Tag></header>
        <h2 className="sheet-heading">{currentPost.title}</h2><p className="post-detail-text">{currentPost.text}</p>
        <PhotoAlbum images={currentPost.images} label={currentPost.title}/>
        {currentPost.location && <button className="post-location" onClick={() => { const place=allPlaces.find(x => x.id===currentPost.placeId); if(place) openPlace(place) }}><Icon name="location"/>{allPlaces.find(x => x.id===currentPost.placeId)?.name || currentPost.location}</button>}
        <div className="wall-actions post-detail-actions">
          <button aria-label="点赞帖子" aria-pressed={liked.includes(currentPost.id)} onClick={() => setLiked(prev => toggle(prev, currentPost.id))}><Icon name="like"/>{liked.includes(currentPost.id) ? '已赞' : '点赞'} {currentPost.likes + Number(liked.includes(currentPost.id))}</button>
          <button onClick={() => commentInput.current?.focus()}><Icon name="chat"/>评论 {currentPost.comments.length}</button>
          <button aria-pressed={saved.includes(currentPost.id)} onClick={() => setSaved(prev => toggle(prev, currentPost.id))}><Icon name="bookmark"/>{saved.includes(currentPost.id) ? '已收藏' : '收藏'}</button>
        </div>
<div className="detail-tools">{!currentPost.owned && !currentPost.anonymous && ['南门观察员', '校园漫游', '学姐的备忘录', '周末不宅', '整理书架中'].includes(currentPost.author) && <Button onClick={() => { setContact('author-' + (['南门观察员', '校园漫游', '学姐的备忘录', '周末不宅', '整理书架中'].indexOf(currentPost.author) + 1)) }}> 联系同学</Button>}{currentPost.owned ? <Button danger onClick={() => { setPosts(prev => prev.filter(p => p.id !== currentPost.id)); setLiked(prev => prev.filter(id => id !== currentPost.id)); setSaved(prev => prev.filter(id => id !== currentPost.id)); setHistory(prev => prev.filter(id => id !== currentPost.id)); detailStack.current = detailStack.current.filter(frame => frame.panel !== 'post' || frame.postId !== currentPost.id); closePanel(); setNotice('已删除自己的演示动态。') }}>删除我的动态</Button> : <Button disabled={reported.includes(currentPost.id)} onClick={() => setPanel('report')}>{reported.includes(currentPost.id) ? reports.find(r => r.postId === currentPost.id)?.resolved ? '举报已处理' : '已举报，等待审核' : '举报'}</Button>}</div><section className="post-detail-comments" aria-label="帖子评论"><h3 className="comments-heading">评论 {currentPost.comments.length}</h3>{currentPost.comments.length ? currentPost.comments.map(c => <div className="campus-comment" key={c.id}><div className="comment-author"><UserAvatar name={c.author} anonymous={c.author === nickname}/><b>{c.author}</b></div><p>{c.text}</p></div>) : <p className="subtle">还没有评论，来聊两句。</p>}</section><form className="comment-form post-detail-composer" onSubmit={e => { e.preventDefault(); if (!comment.trim()) return; setPosts(posts.map(p => p.id === currentPost.id ? { ...p, comments: [...p.comments, { id: uid(), author: nickname, text: comment.trim() }] } : p)); setComment('') }}><Input ref={commentInput} aria-label="评论内容" value={comment} maxLength={300} onChange={e => setComment(e.target.value)} placeholder="友善地说两句"/><Button htmlType="submit" type="primary" disabled={!comment.trim()}>发送</Button></form>
      </article>}
      {panel === 'place' && selectedPlace?.kind === '好玩' && <PlaceCommunity view={placeViews[selectedPlace.id] || {sort:'热门'}} updateView={patch => setPlaceViews(prev => ({...prev,[selectedPlace.id]:{...(prev[selectedPlace.id] || {sort:'热门'}),...patch}}))} key={selectedPlace.id} place={selectedPlace} posts={posts.filter(p => !p.visibility || p.visibility === 'campus')} liked={liked} saved={saved} toggleLike={id => setLiked(prev => toggle(prev,id))} toggleSave={id => setSaved(prev => toggle(prev,id))} openPost={openPost} share={() => sharePlace(selectedPlace)}/>}
      {panel === 'place' && selectedPlace && selectedPlace.kind !== '好玩' && <><Tag>{selectedPlace.area} · {selectedPlace.category}</Tag><h2 className="sheet-heading">{selectedPlace.name}</h2><p>{selectedPlace.desc}</p>{placePhotos[selectedPlace.id] && <section className="place-detail-gallery" aria-label="地点相册"><p className="photo-hint">环境预览 · {placePhotos[selectedPlace.id].length} 张 · 点击放大</p><PhotoAlbum images={placePhotos[selectedPlace.id].map(photo=>photo.src)} label={selectedPlace.name}/><p className="photo-hint">示意照片 · Unsplash，非校园实拍</p></section>}<div className="permission-row"><b>位置</b><span>{selectedPlace.location}</span></div><div className="permission-row"><b>参考价格</b><span>{selectedPlace.price}</span></div><div className="permission-row"><b>开放信息</b><span>{selectedPlace.hours}</span></div><Button block type="primary" className="spaced" onClick={() => setSaved(toggle(saved, selectedPlace.id))}>{saved.includes(selectedPlace.id) ? '取消收藏地点' : '收藏这个地点'}</Button><Button block className="spaced" onClick={() => { setPanel(null); browse(selectedPlace.kind === '好吃' ? '美食发现' : '校园日常') }}>看看同学的分享</Button><p className="demo-note">以上均为虚构校园样例，正式内容需学校与商户提供。</p></>}
      {['collection', 'my-posts', 'history', 'liked'].includes(panel || '') && <><div className="compact-post-list">{(panel === 'liked' ? posts.filter(p => liked.includes(p.id)) : panel === 'collection' ? posts.filter(p => saved.includes(p.id)) : panel === 'my-posts' ? posts.filter(p => p.owned) : history.map(id => posts.find(p => p.id === id)).filter((p): p is CampusPost => !!p)).map(p => <button key={p.id} onClick={() => openPost(p)}><small>{p.category} · {p.author}{p.owned && ` · ${visibilityLabel(p.visibility)}`}</small><b>{p.title}</b><Icon name="next"/></button>)}{panel === 'collection' && discoverShops.filter(s => saved.includes(s.id) && !allPlaces.some(p => p.id === s.id)).map(s => <button key={s.id} onClick={() => setDiscoverId(s.id)}><small>好吃 · {s.area}</small><b>{s.name}</b><Icon name="next"/></button>)}{panel === 'collection' && allPlaces.filter(p => saved.includes(p.id)).map(p => <button key={p.id} onClick={() => openPlace(p)}><small>{p.kind} · {p.area}</small><b>{p.name}</b><Icon name="next"/></button>)}</div>{(panel === 'liked' ? !posts.some(p => liked.includes(p.id)) : panel === 'collection' ? !saved.length : panel === 'my-posts' ? !posts.some(p => p.owned) : !posts.some(p => history.includes(p.id))) && <div className="empty"><p>这里还没有内容</p><Button onClick={() => { setPanel(null); go('home') }}>去校园墙逛逛</Button></div>}</>}
      {panel === 'nickname' && <form onSubmit={e => { e.preventDefault(); if (!nicknameDraft.trim()) return; setNickname(nicknameDraft.trim()); setPosts(posts.map(p => p.owned && !p.anonymous ? { ...p, author: nicknameDraft.trim() } : p)); setPanel(null) }}><label className="field-label" htmlFor="nickname">昵称</label><Input id="nickname" value={nicknameDraft} maxLength={16} onChange={e => setNicknameDraft(e.target.value)}/><Button block htmlType="submit" type="primary" disabled={!nicknameDraft.trim()} className="spaced">保存昵称</Button></form>}
      {panel === 'report' && currentPost && <><p>举报将交由社区管理处理，不包含私人聊天内容。</p><Select aria-label="举报原因" value={reportReason} onChange={setReportReason} options={['不友善或冒犯内容', '泄露个人信息', '广告或虚假信息', '其他'].map(value => ({ value, label: value }))}/><Button block type="primary" className="spaced" onClick={() => { const error = report(currentPost.id, reportReason); if (error) { setNotice(error); return }; setPanel('post'); setNotice('举报已进入管理员审核队列（本地演示）。') }}>提交举报</Button></>}
      {panel === 'privacy' && <><h3>公开分享与私人对话分开</h3><p>校园墙的动态和评论面向同校同学。AI 对话不公开，教师和管理员没有聊天原文入口。</p><h3>心理支持数据用途</h3><p>正式服务接入后，心理支持相关数据用于状态分析与学校心理支持；必要的评估摘要、趋势及预警仅向授权心理教师提供。学生界面不展示评估分数、风险标签或报告。</p><p>公开帖子不会在本演示中被偷偷分析。正式服务若需将社区内容用于心理分析，必须另外明确数据范围和授权规则。</p><Alert type="info" title="当前为前端体验" description="不上传内容、不进行真实分析、不发送预警。真实授权、加密与访问控制需由后端实施。"/></>}
      {panel === 'support' && <>{supportSent ? <><Alert type="success" title="已记录联系意向（演示）" description={`${reason}。未向真实教师发送申请，也未预约成功。`}/><Button block className="spaced" onClick={() => setSupportSent(false)}>撤回演示意向</Button></> : <form onSubmit={e => { e.preventDefault(); setSupportSent(true) }}><p>可以预约与心理老师交流。这里不需要提交私人对话或测评结果。</p><label className="field-label">交流方向</label><Select aria-label="交流方向" value={reason} onChange={setReason} options={['想预约一次谈话', '学习与适应', '人际关系', '其他事情'].map(value => ({ value, label: value }))}/><Checkbox className="spaced" checked={supportConsent} onChange={e => setSupportConsent(e.target.checked)}>了解正式申请仅向授权教师提供必要联系信息。</Checkbox><Button block type="primary" htmlType="submit" className="spaced" disabled={!supportConsent}>记录联系意向</Button></form>}<p className="subtle spaced">这里不是实时求助通道。如需及时支持，请直接联系学校心理中心或身边可信任的人。</p></>}
      {panel === 'identity' && <><p className="subtle">仅自己可见 · 可在“编辑资料”中修改</p><div className="permission-row"><b>网名</b><span>{nickname}</span></div><div className="permission-row"><b>真实姓名</b><span>{profileIdentity.realName || '未填写'}</span></div><div className="permission-row"><b>学号</b><span>{profileIdentity.studentNumber || '未填写'}</span></div><div className="permission-row"><b>演示账号</b><span>{session.id}</span></div><div className="permission-row"><b>学校</b><span>青禾大学 · 示例</span></div>{([['college', '学院'], ['major', '专业'], ['grade', '年级'], ['className', '班级']] as const).map(([key, label]) => <div className="permission-row" key={key}><b>{label}</b><span>{profileIdentity.schoolDetails[key] || '未填写'}</span></div>)}<Alert className="spaced" type="info" title="校园身份认证尚未接入" description="正式认证需对接学校统一身份服务。当前填写的学校详情仅在本次体验中保留，尚未经学校核验。"/></>}
    </Sheet>
  </>
}


export function StudentArea(props: Parameters<typeof StudentContent>[0]) {
  const [people, setPeople] = useState(initialPeople)
  const [contact, setContact] = useState<string | null>(null)
  const open = (name: string) => {
    const person = people.find(p => p.name === name)
    const id = person?.id || 'peer:' + name
    if (!person) setPeople(prev => [...prev, { id, name, note: '来自校园社区' }])
    setContact(id)
  }
  return <SocialContext.Provider value={{ people, contact, open, close: () => setContact(null), self: props.session.name }}><StudentContent {...props}/></SocialContext.Provider>
}

