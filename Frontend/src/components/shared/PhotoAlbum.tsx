import { useRef, useState } from 'react'
import { Carousel, Image } from 'antd'
import type { CarouselRef } from 'antd/es/carousel'
import './PhotoAlbum.css'
type Props = { images: string[]; label: string }
export function PhotoAlbum(props: Props) { return props.images.length ? <Album key={props.images.join('|')} {...props}/> : null }
function Album({images,label}: Props) {
 const carousel=useRef<CarouselRef>(null)
 const [index,setIndex]=useState(0)
 const [preview,setPreview]=useState(false)
 return <section className="photo-album" aria-label={label} aria-roledescription="轮播" onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();if(e.key==='ArrowLeft')carousel.current?.prev();else carousel.current?.next()}}}>
 <Carousel ref={carousel} dots={false} infinite={false} afterChange={setIndex} swipeToSlide draggable>{images.map((src,i)=><div key={src+i}><button type="button" className="photo-album-slide" aria-label={`放大${label}第${i+1}张`} onClick={()=>{setIndex(i);setPreview(true)}}><img src={src} alt={`${label} ${i+1}`} loading={Math.abs(i-index)<=1?'eager':'lazy'} onError={e=>{e.currentTarget.style.opacity='0';e.currentTarget.parentElement?.classList.add('photo-album-failed')}}/><span className="photo-album-error">图片暂时无法加载，试试其他照片</span></button></div>)}</Carousel>
 <div className="photo-album-controls"><button type="button" aria-label="上一张照片" disabled={index===0} onClick={()=>carousel.current?.prev()}>‹</button><span aria-live="polite">{index+1} / {images.length}</span><small>左右滑动 · 点击放大</small><button type="button" aria-label="下一张照片" disabled={index===images.length-1} onClick={()=>carousel.current?.next()}>›</button></div>
 <Image.PreviewGroup items={images} preview={{open:preview,current:index,onOpenChange:setPreview,onChange:next=>{setIndex(next);carousel.current?.goTo(next,true)}}}/>
 </section>
}

