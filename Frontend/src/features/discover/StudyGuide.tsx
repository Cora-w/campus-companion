import { useEffect, useRef, useState } from 'react'
import { themes, useAppearance } from '../../theme/appearance'
import { useSchool } from '../auth/SchoolContext'
import { useIdentity } from '../identity/IdentityContext'
import { Timetable } from '../timetable/Timetable'
import './CampusMap.css'
type Place={name:string;building:string;room:string}
export function StudyGuide({tab,setTab,active=true}:{tab:string;setTab:(value:string)=>void;active?:boolean}){
 const {themeId}=useAppearance(),school=useSchool(),identity=useIdentity()
 const mapFrame=useRef<HTMLIFrameElement>(null)
 const [destination,setDestination]=useState<Place|null>(null)
 const storageKey=`campus-timetable-v1:${school?.id||'unknown'}:${identity.self.userId}`
 useEffect(()=>{mapFrame.current?.contentDocument?.documentElement.style.setProperty('--app-accent',themes.find(theme=>theme.id===themeId)!.accent)},[themeId])
 return <section className={tab==='找地点'?'study-guide study-guide-map':'study-guide'}>
 <div className="study-mode-switch" role="group" aria-label="校园查询方式">{['找地点','我的课表'].map(t=><button key={t} type="button" aria-pressed={tab===t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
 <div hidden={tab!=='我的课表'}><Timetable key={storageKey} storageKey={storageKey} active={active&&tab==='我的课表'} onLocate={place=>{setDestination(place);setTab('找地点')}}/></div>{tab==='找地点'&&<iframe ref={mapFrame} className="campus-original-map" title="三星堆校区地图" src="/campus/sanxingdui-map.html" allow="geolocation" data-disable-back-gesture="true" onLoad={e=>{
  e.currentTarget.contentDocument?.documentElement.style.setProperty('--app-accent',themes.find(theme=>theme.id===themeId)!.accent)
  if(!destination)return
  const input=e.currentTarget.contentDocument?.querySelector<HTMLInputElement>('#q')
  if(input){input.value=destination.building;input.dispatchEvent(new Event('input',{bubbles:true}))}
 }}/>}</section>
}
