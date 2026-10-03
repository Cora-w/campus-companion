import type { ShopOrder } from './commerce'
import type { SnackShop } from '../../data/snackData'

export type CommerceState = { shops:SnackShop[]; orders:ShopOrder[] }
type Actor = { role:string; id:string; shopId?:string } | null
const fail = (state:CommerceState, error:string) => ({ state, error })

export function placeOrderTransaction(state:CommerceState, order:ShopOrder, actor:Actor) {
  if (actor?.role !== 'student' || actor.id !== order.studentId) return fail(state,'请先以学生身份登录。')
  if (state.orders.some(o => o.id === order.id)) return fail(state,'订单已提交，请勿重复提交。')
  const shop = state.shops.find(s => s.id === order.shopId)
  if (!shop || !order.items.length || order.status !== '待接单') return fail(state,'订单无效，请重新选购。')
  const seen = new Set<string>()
  for (const item of order.items) {
    const product = shop.products.find(p => p.id === item.productId)
    if (!product || product.active === false) return fail(state,`${item.name}已下架，请重新选购。`)
    if (seen.has(item.productId) || !Number.isSafeInteger(item.count) || item.count < 1) return fail(state,'商品数量无效，请重新选购。')
    seen.add(item.productId)
    if (item.count > product.stock) return fail(state,`${product.name}库存不足，目前剩余 ${product.stock} 件。`)
    if (item.price !== product.price) return fail(state,'商品价格已更新，请确认购物车后重新提交。')
  }
  if (!['送货上门','到店自提'].includes(order.mode)) return fail(state,'请选择收货方式。')
  if (order.mode === '送货上门' && (!order.address.trim() || !order.recipient.trim() || !/^1[3-9]\d{9}$/.test(order.phone))) return fail(state,'请补全有效的配送信息。')
  const fee = order.mode === '送货上门' ? 300 : 0
  if (order.fee !== fee || order.total !== order.items.reduce((sum,i) => sum+i.price*i.count,fee)) return fail(state,'订单金额已变化，请重新确认。')
  const quantities = new Map(order.items.map(i => [i.productId,i.count]))
  return { error:'', state:{ orders:[order,...state.orders], shops:state.shops.map(s => s.id !== shop.id ? s : {...s,products:s.products.map(p => ({...p,stock:p.stock-(quantities.get(p.id)||0)}))}) } }
}

export function changeOrderTransaction(state:CommerceState, id:string, status:ShopOrder['status'], actor:Actor) {
  const order = state.orders.find(o => o.id === id)
  if (!order) return fail(state,'订单不存在。')
  const student = actor?.role === 'student' && actor.id === order.studentId
  const merchant = actor?.role === 'merchant' && actor.shopId === order.shopId
  if (!merchant && !(student && status === '已取消')) return fail(state,'无权操作这笔订单。')
  const next = order.status === '待接单' ? ['备货中','已取消'] : order.status === '备货中' ? [order.mode === '送货上门' ? '配送中' : '待自提'] : ['配送中','待自提'].includes(order.status) ? ['已完成'] : []
  if (!next.includes(status)) return fail(state,'订单状态已变化，当前无法执行此操作。')
  const quantities = new Map(order.items.map(i => [i.productId,i.count]))
  return { error:'', state:{ orders:state.orders.map(o => o.id === id ? {...o,status} : o), shops:status !== '已取消' ? state.shops : state.shops.map(s => s.id !== order.shopId ? s : {...s,products:s.products.map(p => ({...p,stock:p.stock+(quantities.get(p.id)||0)}))}) } }
}

