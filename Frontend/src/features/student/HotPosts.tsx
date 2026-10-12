import { useCommerce } from '../commerce/commerce'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CampusPost } from '../../data/campusData'
import { Icon } from '../../components/shared/Shared'
import './HotPosts.css'

export function HotPosts({ posts, openPost, blocked, openShop }: { posts: CampusPost[]; openPost: (post: CampusPost) => void; blocked: boolean; openShop: (id: string) => void }) {
 const { promotion, shops } = useCommerce()
 const store = shops.find(s=>s.id==='afterclass'&&s.isOpen!==false)
 const count = Math.max(1, posts.length + Number(promotion.enabled && !!store))
 const [index,setIndex]=useState(0)
 const current=index%count
 const viewport=useRef<HTMLDivElement>(null)
 const gesture=useRef<{id:number;x:number;y:number;moved:boolean;horizontal:boolean}|null>(null)
 const suppressClick=useRef(false)
 const busy=useRef(false)
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const [offset,setOffset]=useState(0)
 const [animating,setAnimating]=useState(false)
 const [target,setTarget]=useState<{index:number;direction:number}|null>(null)
 const slide=useCallback((next:number,direction:number)=>{
  if(busy.current)return
  busy.current=true
  setTarget({index:next,direction});setAnimating(true)
  setOffset(-direction*(viewport.current?.clientWidth||350))
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  timer.current=setTimeout(()=>{setAnimating(false);setIndex(next);setOffset(0);setTarget(null);busy.current=false},reduced?0:340)
 },[])
 const reset=()=>{setAnimating(true);setOffset(0)}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 useEffect(()=>{
  if(blocked||count<2)return
  const interval=setInterval(()=>{if(!document.hidden&&!gesture.current&&!busy.current)slide((current+1)%count,1)},4000)
  return ()=>clearInterval(interval)
 },[blocked,count,current,slide])
 return <section className="hot-posts" aria-label="校园精选与商家推广轮播" aria-roledescription="轮播">
 <div ref={viewport} className="hot-swipe-viewport"
 onPointerDown={e=>{if(!e.isPrimary||e.button!==0||busy.current)return;suppressClick.current=false;setAnimating(false);gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,horizontal:false}}}
 onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>8||Math.abs(dy)>8)g.moved=true;if(!g.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){g.horizontal=true;e.currentTarget.setPointerCapture(e.pointerId)}if(g.horizontal&&count>1)setOffset(Math.max(-e.currentTarget.clientWidth,Math.min(e.currentTarget.clientWidth,dx)))}}
 onPointerUp={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;gesture.current=null;suppressClick.current=g.moved;const dx=e.clientX-g.x;if(g.horizontal&&count>1&&Math.abs(dx)>Math.min(70,e.currentTarget.clientWidth*.18)){const direction=dx<0?1:-1;slide((current+direction+count)%count,direction)}else reset()}}
 onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;reset()}}
 onLostPointerCapture={e=>{if(e.target===e.currentTarget&&gesture.current){gesture.current=null;suppressClick.current=true;reset()}}}>
 <div className={'hot-swipe-track'+(animating?' is-settling':'')} style={{transform:'translate3d(calc(-100% + '+offset+'px),0,0)'}}>
 {[-1,0,1].map(position=>{const number=target&&position===target.direction?target.index:(current+position+count)%count;const post=posts[number];const promoted=!post;return <button key={position} tabIndex={position===0?0:-1} aria-hidden={position!==0} className={'freshman-banner hot-post-card '+(promoted?'merchant-promotion':'')} onClick={e=>{if(busy.current||position!==0)return;if(suppressClick.current&&e.detail!==0){e.preventDefault();suppressClick.current=false;return}if(promoted&&store)openShop(store.id);else if(post)openPost(post)}} aria-label={promoted?'查看商家推广：'+(store?.name||'店铺'):'查看热门帖子：'+post.title}><span className="hot-post-copy"><small>{promoted ? '广告 · 商家推广（演示位）' : `同学们都在看 / ${post.category}`}</small><b>{promoted ? promotion.title : post.title}</b><em>{promoted ? `${(store?.name||'店铺')} · 点击进店选购` : `${post.author} · ${post.likes} 人点赞`} <Icon name="next"/></em></span><span className="feature-number" aria-hidden="true">{promoted ? 'SHOP' : String(number + 1).padStart(2, '0')}<span>{promoted ? <>CAMPUS<br/>SNACKS</> : <>CAMPUS<br/>POPULAR</>}</span></span></button>})}
 </div></div>
 <div className="hot-post-controls"><span>{current+1} / {count}</span><div>{Array.from({length:count},(_,i)=><button key={i} aria-label={i===posts.length?'查看商家推广':'查看第'+(i+1)+'条热门帖子'} aria-current={i===current?'true':undefined} onClick={()=>{if(i!==current)slide(i,i>current?1:-1)}}><i/></button>)}</div></div>
 </section>
}
