import type { MarketItem, BuddyActivity } from './hubData'
export const sampleProductPhotos: Record<string,string[]> = {
 m1:['https://images.unsplash.com/photo-1621447980929-6638614633c8?auto=format&fit=crop&w=900&q=80'],
 m3:['https://images.unsplash.com/photo-1585521747230-516376e5a85d?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1585521549926-ca6526bda09e?auto=format&fit=crop&w=900&q=80'],
}
export const sellerName=(item:MarketItem)=>item.seller || (item.owner?'小禾同学':item.id==='m1'?'小林同学':item.id==='m2'?'阿远':'整理书架中')
export const hostName=(a:BuddyActivity)=>a.owner?'小禾同学':a.id==='b1'?'阿远同学':'周末不宅'

