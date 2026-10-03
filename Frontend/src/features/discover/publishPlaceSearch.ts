import type { DeviceLocation } from './locationService'

export type SearchPlace = { id: string; name: string; address: string; distance?: number }
type Feature = { properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }
const distance = (a: DeviceLocation, lat: number, lon: number) => {
  const rad = Math.PI / 180
  const h = Math.sin((lat - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(lat * rad) * Math.sin((lon - a.longitude) * rad / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}

// Photon uses WGS84 coordinates, the same coordinate system as browser geolocation.
// Requests are user-triggered; do not persist device coordinates or add them to posts.
export async function searchPlaces(query: string, position: DeviceLocation | null, signal: AbortSignal): Promise<SearchPlace[]> {
  const params = new URLSearchParams({ limit: '12' })
  if (query) params.set('q', query)
  if (position) { params.set('lat', String(position.latitude)); params.set('lon', String(position.longitude)) }
  if (!query) { if (!position) return []; params.set('radius', '2') }
  const response = await fetch(`https://photon.komoot.io/${query ? 'api' : 'reverse'}/?${params}`, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new Error('地点服务暂时不可用，请重试或手动填写。')
  const data = await response.json() as { features?: Feature[] }
  if (!Array.isArray(data.features)) throw new Error('地点服务返回异常，请手动填写。')
  const result: SearchPlace[] = []
  for (const [index, feature] of data.features.entries()) {
    const props = feature.properties ?? {}
    const value = (key: string) => typeof props[key] === 'string' ? props[key] as string : ''
    const name = value('name') || value('street')
    if (!name) continue
    const address = [...new Set(['city', 'district', 'street', 'housenumber'].map(value).filter(v => v && v !== name))].join(' · ')
    const coords = feature.geometry?.coordinates
    const meters = position && coords?.length === 2 && coords.every(Number.isFinite) ? distance(position, coords[1], coords[0]) : undefined
    if (!query && meters !== undefined && meters > 2000) continue
    if (result.some(place => place.name === name && place.address === address)) continue
    result.push({ id: `${props.osm_type ?? ''}-${props.osm_id ?? index}`, name, address, distance: meters })
  }
  return !query ? result.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)) : result
}

