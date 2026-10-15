import { useEffect, useRef, useState } from 'react'
import { Button, Input } from 'antd'
import { requestDeviceLocation } from '../discover/locationService'
import type { DeviceLocation } from '../discover/locationService'
import { searchPlaces } from '../discover/publishPlaceSearch'
import type { SearchPlace } from '../discover/publishPlaceSearch'
import { Icon } from '../../components/shared/Shared'

export function PublishLocation({ value, save }: { value: string; save: (value: string) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(value)
  const [detail, setDetail] = useState('')
  const [position, setPosition] = useState<DeviceLocation | null>(null)
  const [results, setResults] = useState<SearchPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const request = useRef(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current++; controller.current?.abort() }, [])
  const cancelPending = () => { request.current++; controller.current?.abort(); setLoading(false) }
  const lookup = async (locate: boolean) => {
    const id = ++request.current
    controller.current?.abort()
    const abort = new AbortController(); controller.current = abort
    setLoading(true); setError(''); setResults([]); setSearched(false)
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      let current = position
      if (locate) {
        current = await requestDeviceLocation()
        if (id !== request.current) return
        setPosition(current); setQuery('')
      }
      timeout = setTimeout(() => abort.abort(), 12000)
      const places = await searchPlaces(locate ? '' : query.trim(), current, abort.signal)
      if (id !== request.current) return
      setResults(places); setSearched(true)
    } catch (e) {
      if (id === request.current) setError(e instanceof Error && e.name !== 'AbortError' && e.name !== 'TypeError' ? e.message : '地点加载失败或超时，可以重试，也可以手动填写。')
    } finally { clearTimeout(timeout); if (id === request.current) setLoading(false) }
  }
  const fullLocation = [selected.trim(), detail.trim()].filter(Boolean).join(' · ')
  return <div className="publish-location-picker">
    <div className="publish-location-search"><Input aria-label="搜索地点" placeholder="搜索学校、楼栋或附近店铺" value={query} maxLength={60} allowClear onChange={e => { cancelPending(); setQuery(e.target.value); setResults([]); setSearched(false); setError('') }} onPressEnter={() => { if (query.trim()) void lookup(false) }} prefix={<Icon name="search"/>}/><Button disabled={!query.trim() || loading} onClick={() => void lookup(false)}>搜索</Button></div>
    <button type="button" className="publish-locate" aria-label={position ? '重新定位，查看附近地点' : '定位并查找附近地点'} disabled={loading} onClick={() => void lookup(true)}><Icon name="location"/><span><b>{loading ? '正在获取位置与地点…' : position ? '重新定位，查看附近地点' : '定位并查找附近地点'}</b><small>{position ? `定位精度约 ${Math.round(position.accuracy)} 米，位置不准可搜索修改` : '允许定位后，选择实际所在的地点'}</small></span></button>
    <p className="location-data-note">定位会将坐标发送至 Photon 地点服务；发布只显示你确认的地点名称。</p>
    {error && <p role="alert" className="error-text">{error}</p>}
    {loading && <p role="status" className="subtle">正在查找，可直接在下方手动填写。</p>}
    {searched && <p className="location-results-label">{query.trim() ? '搜索结果' : '附近 2 公里内的地点'}{!results.length && ' · 暂无结果，可搜索其他名称或手动填写'}</p>}
    <div className="location-results">{results.map(place => <button type="button" key={place.id} className={selected === place.name ? 'selected' : ''} onClick={() => { setSelected(place.name); setDetail('') }}><Icon name="location"/><span><b>{place.name}</b><small>{place.address || '可补充楼层、门牌等详细位置'}{place.distance !== undefined && ` · 约${place.distance < 1000 ? `${Math.round(place.distance)} 米` : `${(place.distance / 1000).toFixed(1)} 公里`}`}</small></span>{selected === place.name && <Icon name="check"/>}</button>)}</div>
    <div className="location-manual"><label htmlFor="post-location">地点名称 · 可手动修改</label><Input id="post-location" placeholder="例如：XX大学 · 第一食堂" value={selected} maxLength={60} onChange={e => { cancelPending(); setSelected(e.target.value) }}/><label htmlFor="post-location-detail">补充位置（可选）</label><Input id="post-location-detail" placeholder="例如：二楼 06 窗口 / 东侧入口" value={detail} maxLength={40} onChange={e => setDetail(e.target.value)}/></div>
    <div className="location-confirm"><Button onClick={() => save('')}>不显示位置</Button><Button type="primary" disabled={!selected.trim()} onClick={() => save(fullLocation)}>确认位置</Button></div>
    <p className="location-attribution">地点数据：<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> · Photon</p>
  </div>
}

