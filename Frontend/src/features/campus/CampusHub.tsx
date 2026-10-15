import { Drawer } from '../../navigation/BackOverlays'
import './ActivityLayout.css'
import { StudyGuide } from '../discover/StudyGuide'
import { MarketCheckout } from './MarketCheckout'
import { UserAvatar } from '../../components/shared/UserAvatar'
import { useEffect, useState } from 'react'
import { Button, Input, InputNumber, Tag } from 'antd'
import { Icon } from '../../components/shared/Shared'
import { schoolNotices, marketSeed, activitySeed, hubTitles } from '../../data/hubData'
import type { HubPage, SupportRequest, BuddyActivity } from '../../data/hubData'
import { uid } from '../../data/data'
import type { Session } from '../../data/data'
import './CampusHub.css'
import { ListeningSpace } from '../listening/ListeningSpace'
import { Person, ProductPhotos } from '../messages/HubSocial'
import { sellerName, hostName } from '../../data/hubSocialData'
import type { HubConversation } from '../messages/HubSocial'

const activityClosed = (a: BuddyActivity) => a.closed || (!a.time.includes('样例') && new Date(a.time.replace(' ', 'T')).getTime() <= Date.now())

type Props = { onConversation:(conversation:HubConversation)=>void; onAccess:(access:Record<string,boolean>)=>void; page:HubPage|null; close:()=>void; session:Session; requests:SupportRequest[]; requestSupport:(topic:string)=>void }
export function CampusHub({page:requestedPage,close,session,onConversation,onAccess,requests,requestSupport}:Props) {
  const page = requestedPage === 'listen' && session.role !== 'student' ? null : requestedPage
  const [guideTab,setGuideTab]=useState('校园查询')
  const [studyTab,setStudyTab]=useState('找地点')
  const [noticeComments,setNoticeComments]=useState<Record<string,{id:string;author:string;text:string}[]>>({})
  const [noticeDraft,setNoticeDraft]=useState('')
  const [noticeId,setNoticeId]=useState<string|null>(null)
  const [items,setItems]=useState(marketSeed)
  const [checkoutId,setCheckoutId]=useState<string|null>(null)
  const [ordersOpen,setOrdersOpen]=useState(false)
  const [activities,setActivities]=useState(activitySeed)
  const [marketTab,setMarketTab]=useState('在售')
  const [activityTab,setActivityTab]=useState('可加入')
  const [activityDetail,setActivityDetail]=useState<string|null>(null)
  const [expanded,setExpanded]=useState<string|null>(null)
  const [creating,setCreating]=useState(false)
  const [title,setTitle]=useState('')
  const [detail,setDetail]=useState('')
  const [place,setPlace]=useState('')
  const [price,setPrice]=useState<number|null>(null)
  const [capacity,setCapacity]=useState<number|null>(4)
  const [date,setDate]=useState('')
  const [error,setError]=useState('')
  const [photos,setPhotos]=useState<string[]>([])
  const [uploading,setUploading]=useState(false)
  const setConversation=(next:HubConversation)=>{onConversation(next)}
  const selectedNotice=schoolNotices.find(n=>n.id===noticeId)
  const closeHub=()=>{if(creating){setCreating(false);setError('');return}close();setCreating(false);setError('');setExpanded(null);setNoticeId(null)}
  const startCreate=()=>{setCreating(true);setTitle('');setDetail('');setPlace('');setPrice(null);setPhotos([]);setCapacity(4);setDate('');setError('')}
  const publish=()=>{
    if(!title.trim()||!detail.trim()||!place.trim()){setError('请填写标题、说明和地点。');return}
    if(page==='market'){
      if(!photos.length){setError('请添加至少一张商品实拍照片。');return}
      if(price===null||price<0){setError('请填写有效价格，免费转让可填 0。');return}
      setItems(prev=>[{id:uid(),title:title.trim(),detail:detail.trim(),place:place.trim(),price,photos,seller:session.name,owner:true,status:'在售'},...prev]);setMarketTab('我的')
    } else {
      if(!capacity||capacity<2||!date||new Date(date)<=new Date()){setError('请选择未来的活动时间，人数至少为 2 人。');return}
      setActivities(prev=>[{id:uid(),title:title.trim(),detail:detail.trim(),place:place.trim(),time:date.replace('T',' '),count:1,capacity,owner:true,joined:true,closed:false},...prev]);setActivityTab('我的')
    }
    setCreating(false)
  }
  const uploadPhotos=async(files:FileList|null)=>{
    if(!files?.length)return
    if(files.length+photos.length>6){setError('最多上传 6 张照片。');return}
    const selected=Array.from(files)
    if(selected.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024)){setError('请上传 JPG、PNG 或 WebP，每张不超过 5MB。');return}
    setUploading(true);setError('')
    try {const urls=await Promise.all(selected.map(f=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=async()=>{try{const url=String(r.result);const img=new window.Image();img.src=url;await img.decode();resolve(url)}catch(e){reject(e)}};r.readAsDataURL(f)})));setPhotos(prev=>[...prev,...urls])}catch{setError('照片读取失败，请重新选择。')}finally{setUploading(false)}
  }
  useEffect(()=>{onAccess(Object.fromEntries([...items.map(i=>[i.id,i.status==='在售'||!!i.reservedByMe||(i.status==='已预订'&&i.owner)]),...activities.map(a=>[a.id,a.joined&&!activityClosed(a)])]))},[items,activities,onAccess])
  const selectedItem=items.find(i=>i.id===expanded)
  return <><ListeningSpace open={page==='listen'} close={close} session={session} requests={requests} requestSupport={requestSupport}/><Drawer rootClassName="campus-hub-root" className={page==='listen'?'campus-hub listening-drawer':page==='activities'?'campus-hub activities-drawer':page==='guide'&&guideTab==='校园查询'&&studyTab==='找地点'?'campus-hub campus-map-drawer':'campus-hub'} placement="bottom" open={!!page&&page!=='listen'} onClose={closeHub} title={page?hubTitles[page]:''} extra={(page==='market'||page==='activities')&&!creating?<div className="hub-header-actions">{page==='market'&&<Button type="text" onClick={()=>setOrdersOpen(true)}>我的购买</Button>}<button className="icon-button hub-create-button" aria-label={page==='market'?'发布闲置':'发起活动'} title={page==='market'?'发布闲置':'发起活动'} onClick={startCreate}><Icon name="plus"/></button></div>:undefined} closeIcon={<Icon name="back"/>}>
    {page==='guide'&&<>
      <p className="hub-intro">找教室、找老师，也不错过重要通知。</p>
      <div className="hub-tabs">{['校园查询','校园通知'].map(t=><button key={t} className={guideTab===t?'active':''} onClick={()=>setGuideTab(t)}>{t}</button>)}</div>
      <div className="campus-query-pane" hidden={guideTab!=='校园查询'}><StudyGuide tab={studyTab} setTab={setStudyTab} active={guideTab==='校园查询'}/></div>{guideTab==='校园查询'?null:<><p className="hub-caption">以下为通知样例，不代表实际放假或考试安排。</p>{schoolNotices.map(n=><article className="hub-card" key={n.id}><Tag>{n.type}</Tag><h2>{n.title}</h2><p>{n.detail}</p><Button onClick={()=>{setNoticeId(n.id);setNoticeDraft('')}}>查看通知</Button></article>)}</>}
    </>}
    {(page==='market'||page==='activities')&&<>
      <div className="hub-section-head"><p className="hub-intro">{page==='market'?'闲置有去处，成交有状态。':'有空一起，约满就停止招募。'}</p></div>
      <p className="hub-caption">本机交互样例 · 不发生真实交易、报名或消息送达</p>
      {creating?<section className="hub-card hub-create"><h2>{page==='market'?'发布闲置':'发起活动'}</h2><label>标题<Input aria-label="服务标题" value={title} maxLength={40} onChange={e=>setTitle(e.target.value)}/></label><label>详细说明<Input.TextArea aria-label="服务说明" value={detail} maxLength={500} onChange={e=>setDetail(e.target.value)}/></label><label>见面地点<Input aria-label="见面地点" value={place} maxLength={80} onChange={e=>setPlace(e.target.value)}/></label>{page==='market'?<label>价格（元）<InputNumber aria-label="闲置价格" min={0} max={99999} value={price} onChange={setPrice}/></label>:<><label>活动时间<input aria-label="活动时间" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label><label>总人数（含发起人）<InputNumber aria-label="活动人数" min={2} max={30} value={capacity} onChange={setCapacity}/></label></>}{page==='market'&&<div className="product-upload"><label>商品照片（最多 6 张）<input aria-label="上传商品照片" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={e=>{void uploadPhotos(e.target.files);e.target.value=''}}/></label><div className="upload-preview">{photos.map((src,i)=><div key={src}><img src={src} alt={'商品实拍预览 '+(i+1)}/><button aria-label={'移除商品照片'+(i+1)} onClick={()=>setPhotos(prev=>prev.filter((_,j)=>j!==i))}>×</button></div>)}</div></div>}{error&&<p role="alert" className="error-text">{error}</p>}<div className="hub-actions"><Button type="primary" disabled={uploading} onClick={publish}>确认发布</Button><Button onClick={()=>setCreating(false)}>取消</Button></div></section>:page==='market'?<>
        <div className="hub-tabs">{['在售','全部','我的'].map(t=><button key={t} className={marketTab===t?'active':''} onClick={()=>setMarketTab(t)}>{t}</button>)}</div>
        {!items.some(i=>marketTab==='全部'||(marketTab==='我的'?i.owner:i.status==='在售'))&&<p className="empty-copy">这里还没有闲置，可以发布你的第一件物品。</p>}{items.filter(i=>marketTab==='全部'||(marketTab==='我的'?i.owner:i.status==='在售')).map(i=><article className="hub-card market-item" key={i.id} onClick={e=>{if(!(e.target as HTMLElement).closest('button,a,input'))setExpanded(i.id)}}><Person name={sellerName(i)}/><div className="hub-section-head"><Tag>{i.status}</Tag><strong className="item-price">¥{i.price}</strong></div><button className="product-open" onClick={()=>setExpanded(i.id)}><h2>{i.title}</h2><span>查看物品 </span></button><p>{i.detail}</p><small>{i.place}{i.owner?' · 我发布的':''}</small><div className="hub-actions">
          {i.owner?<><Button disabled={i.status!=='在售'} onClick={()=>setItems(prev=>prev.map(x=>x.id===i.id?{...x,status:'已预订'}:x))}>标记预订</Button><Button disabled={i.status==='已售出'} onClick={()=>setItems(prev=>prev.map(x=>x.id===i.id?{...x,status:'已售出',reservedByMe:false}:x))}>标记已售出</Button>{i.status==='已预订'&&<Button onClick={()=>setItems(prev=>prev.map(x=>x.id===i.id?{...x,status:'在售'}:x))}>取消预订</Button>}</>:<><Button className="market-inquiry-button" disabled={i.status!=='在售'} onClick={()=>setExpanded(i.id)}>{i.status==='在售'?'查看与购买':i.status==='已售出'?'已售出 · 停止询问':'已预订 · 暂停询问'}</Button>{i.reservedByMe&&<Button onClick={()=>setOrdersOpen(true)}>查看订单</Button>}</>}
        </div></article>)}
      </>:<><div className="hub-tabs">{['可加入','全部','我的'].map(t=><button key={t} className={activityTab===t?'active':''} onClick={()=>setActivityTab(t)}>{t}</button>)}</div>{!activities.some(a=>activityTab==='全部'||(activityTab==='我的'?a.joined||a.owner:!activityClosed(a)&&a.count<a.capacity))&&<p className="empty-copy">暂时没有符合条件的活动，可以发起一个新活动。</p>}{activities.filter(a=>activityTab==='全部'||(activityTab==='我的'?a.joined||a.owner:!activityClosed(a)&&a.count<a.capacity)).map(a=><article className="activity-compact" key={a.id}><button className="activity-summary" onClick={()=>setActivityDetail(a.id)} aria-label={'查看活动：'+a.title}><div className="activity-eyebrow"><span>{activityClosed(a)?'已结束':a.count>=a.capacity?'已满员':'还差 '+(a.capacity-a.count)+' 人'}</span><small>{a.owner?'我发起的':a.joined?'已加入':'招募中'}</small></div><h2>{a.title}</h2><p className="activity-when">{a.time.replace(' · 样例','')}</p><p className="activity-where">{a.place}</p></button><div className="activity-card-footer"><Person name={hostName(a)}/><span>{a.count}/{a.capacity} 人</span><Button type="text" onClick={()=>setActivityDetail(a.id)}>查看详情</Button></div></article>)}</>}
    </>}
  </Drawer><Drawer rootClassName="activity-detail-root" placement="bottom" title="活动详情" closeIcon={<Icon name="back"/>} open={page==='activities'&&!!activityDetail} onClose={()=>setActivityDetail(null)}>{activities.filter(a=>a.id===activityDetail).map(a=><article className="activity-full" key={a.id}><Person name={hostName(a)}/><Tag>{activityClosed(a)?'已结束':a.count>=a.capacity?'已满员':'招募中'}</Tag><h2>{a.title}</h2><div className="activity-members"><Person name={hostName(a)} small/>{Array.from({length:Math.min(2,Math.max(0,a.count-1))},(_,i)=><Person key={i} name={a.joined&&!a.owner&&i===0?session.name:i===0?'小林':'小周'} small/>)}<span>{a.count} 位同学已加入</span></div><p>{a.detail}</p><p>{a.time}<br/>{a.place}</p><div className="hub-section-head"><b>{a.count} / {a.capacity} 人</b><div className="hub-actions">{a.owner?<Button disabled={activityClosed(a)} onClick={()=>setActivities(prev=>prev.map(x=>x.id===a.id?{...x,closed:true}:x))}>结束招募</Button>:a.joined?<Button disabled={a.closed} onClick={()=>setActivities(prev=>prev.map(x=>x.id===a.id&&x.joined?{...x,joined:false,count:x.count-1}:x))}>退出活动</Button>:<Button type="primary" disabled={activityClosed(a)||a.count>=a.capacity} onClick={()=>{setActivities(prev=>prev.map(x=>x.id===a.id&&!activityClosed(x)&&!x.joined&&x.count<x.capacity?{...x,joined:true,count:x.count+1}:x));setActivityTab('我的')}}>{a.closed?'已结束':a.count>=a.capacity?'已满员':'加入活动'}</Button>}</div></div>{a.joined&&<Button className="group-chat-entry" onClick={()=>setConversation({id:a.id,kind:'group',title:a.title,person:hostName(a)})}>进入活动群聊</Button>}{a.joined&&<p className="hub-caption">{a.owner?'你是发起人':'已加入（演示）'} · 集合点：{a.place}</p>}</article>)}</Drawer><Drawer rootClassName="product-detail-root" title="闲置详情" placement="bottom" open={!!selectedItem} onClose={()=>setExpanded(null)} closeIcon={<Icon name="back"/>}>{selectedItem&&<><Person name={sellerName(selectedItem)}/><h2>{selectedItem.title}</h2><div className="hub-section-head"><strong className="item-price">¥{selectedItem.price}</strong><Tag>{selectedItem.status}</Tag></div></>}{selectedItem&&<section className="product-detail"><ProductPhotos item={selectedItem}/><h3>物品说明</h3><p>{selectedItem.detail}</p><p>物品所在地：{selectedItem.place}</p><Person name={sellerName(selectedItem)}/><div className="product-purchase-bar">{selectedItem.owner?<Button onClick={()=>setConversation({id:selectedItem.id,kind:'market',title:selectedItem.title,person:'小陈（演示买家）'})}>查看买家会话（演示）</Button>:<><Button disabled={selectedItem.status!=='在售'&&!selectedItem.reservedByMe} onClick={()=>setConversation({id:selectedItem.id,kind:'market',title:selectedItem.title,person:sellerName(selectedItem)})}>联系卖家 · 议价</Button><Button type="primary" disabled={selectedItem.status!=='在售'&&!selectedItem.reservedByMe} onClick={()=>selectedItem.reservedByMe?setOrdersOpen(true):setCheckoutId(selectedItem.id)}>{selectedItem.reservedByMe?'查看订单':selectedItem.status==='在售'?'立即购买':selectedItem.status}</Button></>}</div></section>}</Drawer><MarketCheckout item={items.find(i=>i.id===checkoutId)||null} ordersOpen={ordersOpen} close={()=>{setCheckoutId(null);setOrdersOpen(false)}} available={id=>items.some(i=>i.id===id&&!i.owner&&i.status==='在售')} updateItem={(id,status,reserved)=>setItems(prev=>prev.map(i=>i.id===id?{...i,status,reservedByMe:reserved}:i))} contact={i=>setConversation({id:i.id,kind:'market',title:i.title,person:sellerName(i)})}/><Drawer rootClassName="notice-detail-root" title="通知详情" placement="bottom" open={!!selectedNotice && page==='guide'} onClose={()=>setNoticeId(null)} closeIcon={<Icon name="back"/>} destroyOnHidden>{selectedNotice&&<article className="notice-detail" key={selectedNotice.id}><Tag>{selectedNotice.type}</Tag><h2>{selectedNotice.title}</h2><p className="hub-caption">校园通知 · 样例</p><p className="notice-full-text">{selectedNotice.detail}</p><section aria-label="通知评论"><h3>评论 {(noticeComments[selectedNotice.id]||[]).length}</h3>{(noticeComments[selectedNotice.id]||[]).map(c=><div className="campus-comment" key={c.id}><div className="comment-author"><UserAvatar name={c.author}/><b>{c.author}</b></div><p>{c.text}</p></div>)}{!noticeComments[selectedNotice.id]?.length&&<p className="hub-caption">还没有评论，有问题或想法可以在这里留言。</p>}</section><form className="comment-form" onSubmit={e=>{e.preventDefault();if(!noticeDraft.trim())return;setNoticeComments(prev=>({...prev,[selectedNotice.id]:[...(prev[selectedNotice.id]||[]),{id:uid(),author:session.name,text:noticeDraft.trim()}]}));setNoticeDraft('')}}><Input aria-label="通知评论内容" value={noticeDraft} maxLength={300} onChange={e=>setNoticeDraft(e.target.value)} placeholder="写下你的评论"/><Button type="primary" htmlType="submit" disabled={!noticeDraft.trim()}>发送</Button></form></article>}</Drawer></>
}

