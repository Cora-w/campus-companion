import { useState } from 'react'
import { Image } from 'antd'
import { rooms } from '../../data/hubData'
import { useBackNavigation } from '../../navigation/useBackNavigation'
import './CampusMap.css'

export function CampusMap({ selected, select }: { selected: string | null; select: (id: string) => void }) {
 const [preview, setPreview] = useState(false)
 useBackNavigation(preview, () => setPreview(false), 4000)
 return <section className="scavc-map" aria-label="四川航天职业技术学院校园地图">
  <header><div><small>四川航天职业技术学院</small><h3>三星堆校区 · 校园地图</h3></div><span>广汉</span></header>
  <Image src={`${import.meta.env.BASE_URL}maps/scavc-sanxingdui-2024.jpg`} alt="四川航天职业技术学院2024年三星堆校区平面示意图，包含教学楼、图书馆、食堂和宿舍位置" width="100%" preview={{ open:preview, onOpenChange:setPreview, zIndex:4000, mask:'点击放大校园地图' }}/>
  <p className="scavc-map-source">学校官方 2024 年版 · 点击图片可放大查看<br/>地图可能与当前现场有变化，请以校内标识为准。<a href="https://www.scavc.com/info/1518/24357.htm" target="_blank" rel="noreferrer">查看学校原图与发布说明 ↗</a></p>
  <div className="scavc-map-places" aria-label="地图地点目录">{rooms.map(room => <button key={room.id} type="button" aria-pressed={room.building === selected} onClick={() => select(room.building)}>{room.building}</button>)}</div>
 </section>
}
