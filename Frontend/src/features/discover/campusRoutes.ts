import { campusPlaces, findCampusPlace } from '../../data/campusMapData.ts'
import type { CampusPlace } from '../../data/campusMapData.ts'
import type { DeviceLocation } from './locationService'

export type RoutePoint = { x: number; y: number }
export type CampusRoute = { points: RoutePoint[]; roads: string[]; from: string; to: string }
export const campusName = '四川航天职业技术学院三星堆校区'
export const southGate = { id: 'south-gate', building: '校门', name: '校门', x: 977, y: 1652 }
export const navigationStarts = [southGate, ...campusPlaces.filter(p => !p.closed && p.id !== 'gate')]
// The supplied HTML draws a straight destination bearing, not a road-following route.
export function createCampusRoute(startId: string, destinationBuilding: string): CampusRoute | null {
 const from = navigationStarts.find(p=>p.id===startId), to = findCampusPlace(destinationBuilding)
 if (!from || !to || to.closed || from.building===to.building) return null
 return { from:from.name,to:to.name,points:[{x:from.x,y:from.y},{x:to.x,y:to.y}],roads:[] }
}
export function placeKind(place: CampusPlace) {
  if (place.closed) return '施工区域'
  if (place.teacher) return '教师公寓'
  if (place.category === 'dorm') return '住宿区域'
  if (place.category === 'food') return '食堂'
  if (place.category === 'sport') return '运动场馆'
  if (/dongfeng|wentian|feitian/.test(place.id)) return '公共广场'
  if (place.id === 'tsg') return '图书馆'
  if (place.category === 'teach') return '教学与实训'
  return '校园服务'
}
export function walkingNavigationUrl(destination: string, origin: string | DeviceLocation) {
  const params = new URLSearchParams({ origin: typeof origin === 'string' ? campusName + ' ' + origin : `latlng:${origin.latitude},${origin.longitude}|name:我的位置`, destination: campusName + ' ' + destination, mode: 'walking', region: '广汉市', output: 'html', coord_type: 'wgs84', src: 'webapp.campus_companion.navigation' })
  return `https://api.map.baidu.com/direction?${params}`
}
