import { useRef, useState } from 'react'
import { Button } from 'antd'
import { requestDeviceLocation } from './locationService'
import type { DeviceLocation } from './locationService'
export function LocationControl(){
 const [position,setPosition]=useState<DeviceLocation|null>(null)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const attempt=useRef(0)
 const locate=async()=>{const id=++attempt.current;setLoading(true);setError('');try{const next=await requestDeviceLocation();if(id===attempt.current)setPosition(next)}catch(e){if(id===attempt.current){setPosition(null);setError(e instanceof Error?e.message:'定位失败')}}finally{if(id===attempt.current)setLoading(false)}}
 return <section className="location-control"><div className="location-toolbar"><div className="location-copy"><b>我的位置</b><p>授权后获取，仅本次使用</p></div><Button type="text" onClick={()=>void locate()} loading={loading}>{position?'重新定位':'定位'}</Button></div>{position&&<><p role="status">已获取位置：{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)} · 精度约 {Math.round(position.accuracy)} 米</p><p>校区坐标尚未接入，不能将此位置映射到示意图。下方仍是“南门出发”的示例路线。</p><Button onClick={()=>{attempt.current++;setPosition(null);setLoading(false);setError('')}}>清除本次位置</Button></>}{error&&<p role="alert">{error}</p>}</section>
}


