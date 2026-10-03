import { campusPlaces } from '../../data/campusData'
import type { CampusPlace } from '../../data/campusData'
export type PlaceResult = CampusPlace & { positiveReviews: number }
export type PlaceQuery = { kind: '好吃' | '好玩'; area?: '校内' | '周边'; keyword?: string; limit?: number }
// Frontend adapter. Replace with an authenticated backend API, never a direct database connection.
export function searchPlaces(query: PlaceQuery): PlaceResult[] {
  const counts: Record<string, number> = { 'place-1': 128, 'place-2': 86, 'place-3': 57, 'place-4': 93 }
  return campusPlaces.filter(p => p.kind === query.kind && (!query.area || p.area === query.area) && (!query.keyword || `${p.name}${p.category}${p.desc}`.includes(query.keyword)))
    .map(p => ({ ...p, positiveReviews: counts[p.id] || 0 }))
    .sort((a, b) => b.positiveReviews - a.positiveReviews || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, query.limit ?? 3))
}
export function recommendationFor(text: string): PlaceResult[] | undefined {
  const kind = /吃|食堂|饭|咖啡|美食/.test(text) ? '好吃' : /玩|周末|活动|展|散步/.test(text) ? '好玩' : undefined
  if (!kind) return undefined
  return searchPlaces({ kind, area: /校外|附近|周边/.test(text) ? '周边' : /校内/.test(text) ? '校内' : undefined, keyword: /咖啡/.test(text) ? '咖啡' : undefined })
}

