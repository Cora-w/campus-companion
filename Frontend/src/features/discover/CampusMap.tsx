import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { campusPlaces, findCampusPlace } from '../../data/campusMapData'
import './CampusMap.css'
import { placeKind } from './campusRoutes'
import type { CampusRoute } from './campusRoutes'

type View = { x:number; y:number; zoom:number }
type Point = { x:number; y:number }
const clampZoom=(zoom:number)=>Math.max(1,Math.min(12,zoom))
type Props = { selected:string|null; select:(id:string)=>void; route?:CampusRoute|null; onNavigate?:()=>void }
export function CampusMap(props: Props) {
 return <MapViewport {...props}/>
}
function MapViewport({ selected, select, route, onNavigate }: Props) {
 const current=findCampusPlace(selected)
 const canvasRef=useRef<SVGSVGElement>(null)
 const [canvasWidth,setCanvasWidth]=useState(350)
 useEffect(()=>{const svg=canvasRef.current;if(!svg)return;const observer=new ResizeObserver(entries=>setCanvasWidth(entries[0].contentRect.width));observer.observe(svg);return()=>observer.disconnect()},[])
 const [hiddenForSelection,setHiddenForSelection]=useState<string|null>(null)
 const [view,setView]=useState<View>({x:current?.x||1190,y:current?.y||1000,zoom:current?4:1})
 const viewRef=useRef(view)
 const localSelection=useRef<string|null>(null)
 const animation=useRef<number|null>(null)
 const pointers=useRef(new Map<number,Point>())
 const gesture=useRef<{points:Point[];view:View}|null>(null)
 const start=useRef<Point|null>(null)
 const moved=useRef(false)
 const update=(next:View)=>{if(animation.current!==null){cancelAnimationFrame(animation.current);animation.current=null}viewRef.current=next;setView(next)}
 const selectOnMap=(building:string)=>{localSelection.current=building;setHiddenForSelection(null);select(building)}
 useEffect(()=>{
  // A tap selects a building without moving the camera. Search may focus it.
  if(localSelection.current===selected){localSelection.current=null;return}
  const target=findCampusPlace(selected)
  if(!target)return
  const from=viewRef.current,startTime=performance.now()
  const tick=(now:number)=>{
   const progress=Math.min(1,(now-startTime)/240),ease=1-Math.pow(1-progress,3)
   const next={x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease,zoom:from.zoom+(4-from.zoom)*ease}
   viewRef.current=next;setView(next)
   animation.current=progress<1?requestAnimationFrame(tick):null
  }
  animation.current=requestAnimationFrame(tick)
  return ()=>{if(animation.current!==null)cancelAnimationFrame(animation.current);animation.current=null}
 },[selected])
 useEffect(()=>{
  if(!route)return
  const xs=route.points.map(p=>p.x),ys=route.points.map(p=>p.y)
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  const frame=requestAnimationFrame(()=>update({x:(minX+maxX)/2,y:(minY+maxY)/2,zoom:Math.min(6,clampZoom(Math.min(1620/(maxX-minX+220),1400/(maxY-minY+220))))}))
  return ()=>cancelAnimationFrame(frame)
 },[route])
 const zoom=(factor:number)=>{const v=viewRef.current;update({...v,zoom:clampZoom(v.zoom*factor)})}
 const width=1620/view.zoom,height=1400/view.zoom
 const move=(e:PointerEvent<SVGSVGElement>)=>{
  if(!pointers.current.has(e.pointerId))return
  const baseline=gesture.current
  if(!baseline)return
  const before=baseline.points
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
  const after=[...pointers.current.values()]
  const center=(points:Point[])=>({x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length})
  const oldCenter=center(before),newCenter=center(after)
  if(start.current&&Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>5)moved.current=true
  const v=baseline.view,box=e.currentTarget.getBoundingClientRect()
  const oldWidth=1620/v.zoom,oldHeight=1400/v.zoom
  const scale=before.length===2?Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y)/Math.max(1,Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y)):1
  const nextZoom=clampZoom(v.zoom*scale)
  // Keep the map point beneath the fingers anchored as their midpoint moves.
  const anchorX=v.x+(oldCenter.x-box.left-box.width/2)*oldWidth/box.width
  const anchorY=v.y+(oldCenter.y-box.top-box.height/2)*oldHeight/box.height
  update({zoom:nextZoom,x:Math.max(0,Math.min(2020,anchorX-(newCenter.x-box.left-box.width/2)*(1620/nextZoom)/box.width)),y:Math.max(0,Math.min(1700,anchorY-(newCenter.y-box.top-box.height/2)*(1400/nextZoom)/box.height))})
 }
 const finish=(e:PointerEvent<SVGSVGElement>,cancelled=false)=>{
  if(!pointers.current.has(e.pointerId))return
  pointers.current.delete(e.pointerId)
  gesture.current=pointers.current.size?{points:[...pointers.current.values()],view:viewRef.current}:null
  if(!cancelled&&!moved.current&&!pointers.current.size){
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-map-place]')
   const place=campusPlaces.find(p=>p.id===target?.getAttribute('data-map-place'))
   if(place)selectOnMap(place.building)
  }
  if(cancelled)moved.current=true
 }
 return <section className="school-map" aria-label="三星堆校区地图">
 <div className="school-map-heading"><strong>三星堆校区</strong><span>校园示意图</span></div>
 <div className="school-map-stage" data-disable-back-gesture="true">
 <svg ref={canvasRef} className="school-map-canvas" viewBox={`${view.x-width/2} ${view.y-height/2} ${width} ${height}`} aria-label="可单指或双指拖动、双指缩放的校园地图"
 onPointerDown={e=>{if(pointers.current.size>=2)return;update(viewRef.current);if(!pointers.current.size){moved.current=false;start.current={x:e.clientX,y:e.clientY}}else moved.current=true;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture.current={points:[...pointers.current.values()],view:viewRef.current};e.currentTarget.setPointerCapture(e.pointerId)}}
 onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}>
 <image href="/campus/sanxingdui-reference.svg" x="380" y="300" width="1620" height="1400"/>
 {route&&<g className="school-map-route" pointerEvents="none"><polyline className="school-map-route-outline" points={route.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#fff" strokeWidth={11/view.zoom} strokeLinejoin="round" strokeLinecap="round"/><polyline data-campus-route="true" points={route.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={5/view.zoom} strokeLinejoin="round" strokeLinecap="round"/>{route.points.filter((_,i)=>i===0||i===route.points.length-1).map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={8/view.zoom} fill={i?'var(--accent)':'#287d62'} stroke="#fff" strokeWidth={3/view.zoom}/>)}</g>}
 {campusPlaces.map(p=>{
 const chosen=p.building===selected
 const shapeProps={className:'school-map-building',fill:chosen?'var(--accent)':'transparent',fillOpacity:chosen?.2:0,stroke:chosen?'var(--accent)':'transparent',strokeWidth:4/view.zoom}
 return <g key={p.id} data-map-place={p.id} role="button" tabIndex={0} aria-label={p.name} aria-pressed={chosen}
 onClick={e=>{if(e.detail===0)selectOnMap(p.building)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectOnMap(p.building)}}}>
 {p.path?<path {...shapeProps} d={p.path}/>:p.polygon?<polygon {...shapeProps} points={p.polygon.map(point=>point.join(',')).join(' ')}/>:<circle {...shapeProps} cx={p.x} cy={p.y} r={20}/>}

 </g>})}
 <g pointerEvents="none">{campusPlaces.filter(p=>!p.closed&&!p.pin&&(p.major||p.building===selected||(p.labelWidth||0)*canvasWidth/width>=((p.short||p.name).length*12+6))).map(p=><text key={p.id} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={(p.major?14:12)*width/canvasWidth} fill="#13235a" stroke="#fafbfd" strokeWidth={3*width/canvasWidth} paintOrder="stroke" fontWeight={p.major?800:600}>{p.short||p.name}</text>)}</g>
 </svg>
 {current&&hiddenForSelection!==current.id&&<section className="school-map-place-panel" aria-label="地点详情"><header><div><small>{placeKind(current)}</small><h3>{current.name}</h3></div><button aria-label="关闭地点详情" onClick={()=>setHiddenForSelection(current.id)}>×</button></header><p>{current.room}</p><details><summary>详细信息</summary><p>所属校区：三星堆校区</p><p>信息依据：{current.source}</p>{current.closed&&<p>施工区域，不可进入或作为通行路线。</p>}{current.description&&<p>{current.description}</p>}</details><button className="school-map-go" disabled={current.closed} onClick={()=>{setHiddenForSelection(current.id);onNavigate?.()}}>{current.closed?'暂不开放':'去这里 · 导航'}</button></section>}
 <div className="school-map-toolbar" role="group" aria-label="地图控制">
 <div className="school-map-zoom"><button onClick={()=>zoom(1.5)} aria-label="放大地图">＋</button><button onClick={()=>zoom(1/1.5)} aria-label="缩小地图">−</button></div>
 <button className="school-map-area" onClick={()=>update({x:1190,y:1000,zoom:1})} aria-label="全校"><span aria-hidden="true">⛶</span><small>全校</small></button>
 <button className="school-map-area" onClick={()=>update({x:622,y:1435,zoom:5})} aria-label="教师公寓区"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V5h14v16M3 21h18M9 21v-4h6v4M9 9h1m4 0h1M9 13h1m4 0h1"/></svg><small>公寓</small></button>
 </div>
 </div>
 <p className="school-map-hint">单指 / 双指拖动 · 双指缩放 · 点建筑看详情</p>
 {selected&&!current&&<p role="status">该课程楼栋尚未匹配校园地图，请核对名称。</p>}
 </section>
}
