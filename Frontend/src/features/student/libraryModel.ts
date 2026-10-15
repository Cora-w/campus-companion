import type { CampusPlace, CampusPost } from '../../data/campusData.ts'
import type { DiscoverReview, DiscoverShop } from '../../data/discoverData.ts'

export const libraryCategories = ['全部', '帖子', '地点', '美食', '店铺', '评价'] as const
export type LibraryCategory = typeof libraryCategories[number]
export type LibraryEntry = {
  id: string; category: Exclude<LibraryCategory, '全部'>; title: string; detail: string
  target: { kind: 'post'; id: string } | { kind: 'place'; id: string } | { kind: 'shop'; id: string; productId?: string; reviewId?: string }
}
export function personalLibrary(posts: CampusPost[], places: CampusPlace[], shops: DiscoverShop[], reviews: DiscoverReview[], ids: string[]): LibraryEntry[] {
  const catalog = new Map<string, LibraryEntry>()
  for (const p of posts) catalog.set(p.id, { id: p.id, category: '帖子', title: p.title, detail: `${p.category} · ${p.author}`, target: { kind: 'post', id: p.id } })
  for (const p of places) catalog.set(p.id, { id: p.id, category: p.kind === '好吃' ? '美食' : '地点', title: p.name, detail: `${p.category} · ${p.location}`, target: { kind: 'place', id: p.id } })
  for (const shop of shops) {
    catalog.set(shop.id, { id: shop.id, category: '店铺', title: shop.name, detail: `${shop.category} · ${shop.address}`, target: { kind: 'shop', id: shop.id } })
    for (const p of shop.products) catalog.set(p.id, { id: p.id, category: '美食', title: p.name, detail: `${shop.name} · ¥${p.price}`, target: { kind: 'shop', id: shop.id, productId: p.id } })
  }
  for (const r of reviews) {
    const shop = shops.find(s => s.id === r.target || s.products.some(p => p.id === r.target))
    if (shop) catalog.set(r.id, { id: r.id, category: '评价', title: r.text, detail: `${r.author} · ${shop.name}`, target: { kind: 'shop', id: shop.id, productId: r.target === shop.id ? undefined : r.target, reviewId: r.id } })
  }
  return [...new Set(ids)].flatMap(id => catalog.has(id) ? [catalog.get(id)!] : [])
}
