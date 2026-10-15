import { useEffect, useRef, useState } from 'react'
import { Button, Select, Tag } from 'antd'
import { findCampusPlace } from '../../data/campusMapData'
import { createCampusRoute, navigationStarts, walkingNavigationUrl } from './campusRoutes'
import type { CampusRoute } from './campusRoutes'
import { requestDeviceLocation } from './locationService'

export type NavigationDestination = { name: string; building: string; room: string }
export function CampusNavigation({ destination, route, onRoute, onChangeDestination }: { destination: NavigationDestination | null; route: CampusRoute | null; onRoute: (route: CampusRoute | null) => void; onChangeDestination: () => void }) {
  const [startId, setStartId] = useState('south-gate')
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const version = useRef(0)
  useEffect(() => () => { version.current++ }, [])
  const place = findCampusPlace(destination?.building || null)
  const start = navigationStarts.find(p => p.id === startId)
  const navigate = () => {
    if (!destination) return
    const next = createCampusRoute(startId, destination.building)
    setError(next ? '' : start?.building === destination.building ? '起点与目的地相同，请更换起点。' : '暂时无法生成这段地点方向连线，请使用地图步行导航。')
    onRoute(next)
  }
  const locateAndOpen = async () => {
    if (!destination || place?.closed) return
    const attempt = ++version.current
    setLocating(true); setError('')
    try { const position = await requestDeviceLocation(); if (version.current === attempt) window.location.assign(walkingNavigationUrl(destination.building, position)) }
    catch (e) { if (version.current === attempt) setError(e instanceof Error ? e.message : '定位失败，请手动选择起点。') }
    finally { if (version.current === attempt) setLocating(false) }
  }
  return <section className="campus-navigation hub-card" aria-label="校园导航">
    <div className="campus-navigation-heading"><h2>导航</h2>{route && <Tag color="blue">地点方向连线</Tag>}</div>
    <label htmlFor="campus-navigation-start">从哪里出发</label>
    <Select id="campus-navigation-start" aria-label="导航起点" showSearch={{ optionFilterProp: 'label' }} value={startId} onChange={value => { version.current++; setLocating(false); setStartId(value); setError(''); onRoute(null) }} options={[{ value: 'current-location', label: '我的位置（地图步行导航）' }, ...navigationStarts.map(p => ({ value: p.id, label: p.name }))]}/>
    <div className="campus-navigation-target"><div><small>到哪里去</small><h3>{destination?.building || '在地图上点一个地点'}</h3>{destination && <p>{destination.room}</p>}</div><Button type="text" onClick={onChangeDestination}>{destination ? '更换' : '选择'}</Button></div>
    {place?.closed && <p role="status" className="campus-navigation-error">施工区域暂不开放，不能作为导航目的地。</p>}
    <div className="campus-navigation-actions"><Button type="primary" disabled={!place || place.closed || !start} onClick={navigate}>显示地点方向</Button>{startId === 'current-location' ? <Button disabled={!destination || place?.closed} loading={locating} onClick={() => void locateAndOpen()}>定位并打开步行导航</Button> : destination && !place?.closed && start ? <a className="campus-external-navigation" href={walkingNavigationUrl(destination.building, start.name)} target="_blank" rel="noopener noreferrer">百度地图步行导航 ↗</a> : <Button disabled>百度地图步行导航</Button>}</div>
    {error && <p role="alert" className="campus-navigation-error">{error}</p>}
    {route && <div className="campus-route-summary" role="status"><b>{route.from} → {route.to}</b><ol><li>从{route.from}出发</li>{route.roads.map((road, i) => <li key={road + i}>沿{road}前行</li>)}<li>连线指向{route.to}，请按现场道路和标识前往</li></ol><Button type="text" onClick={() => onRoute(null)}>隐藏方向连线</Button></div>}
    <p className="hub-caption">连线沿用提供地图中的方向提示，不代表可通行道路。步行路线请打开百度地图，并确认建筑名称与到达位置。</p>
    {startId === 'current-location' && <p className="hub-caption">点击导航后获取本次位置并交给百度地图用于步行路线，不保存定位记录。</p>}
  </section>
}
