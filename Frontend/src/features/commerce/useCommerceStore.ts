import { useRef, useState } from 'react'
import { merchantShopIds } from './commerce'
import type { ShopOrder } from './commerce'
import type { Session } from '../../data/data'
import type { Account } from '../../types/domain'
import { snackShops } from '../../data/snackData'
import type { SnackShop } from '../../data/snackData'
import { changeOrderTransaction, placeOrderTransaction } from './orderTransactions'
import type { CommerceState } from './orderTransactions'
import { canManageShop, saveOwnedShop, moderateOwnedShop } from './shopPermissions'

export function useCommerceStore(session:Session|null, accounts:Account[]) {
  const [state,setState] = useState<CommerceState>({shops:snackShops,orders:[]})
  // Event handlers commit to the same snapshot synchronously, including rapid clicks.
  const latest = useRef(state)
  const commit = (next:CommerceState) => { latest.current = next; setState(next) }
  const schoolOf = (shop: SnackShop) => shop.schoolId || accounts.find(a => a.id === shop.ownerId)?.schoolId || 'sichuan-aerospace-polytechnic'
  const permitted = canManageShop(session, accounts) && accounts.some(a => a.id === session?.id && a.schoolId === session?.schoolId)
  const ownShop = state.shops.find(s => s.ownerId === session?.id)
  const actor = session ? {...session,canManageShop:permitted,shopId:permitted ? ownShop?.id : merchantShopIds[session.id]} : null
  const available = (current:CommerceState) => ({...current,shops:current.shops.filter(s => schoolOf(s) === session?.schoolId).map(s => s.adminSuspended || (s.ownerId && !accounts.some(a => a.id === s.ownerId && a.role === 'student' && a.enabled && a.shopManagement)) ? {...s,isOpen:false} : s)})
  const placeOrder = (order:ShopOrder) => {
    const result = placeOrderTransaction(available(latest.current),order,actor)
    if (!result.error) commit({...result.state,shops:latest.current.shops.map(s => ({...s,products:result.state.shops.find(next => next.id === s.id)?.products || s.products}))})
    return result.error
  }
  const changeOrderStatus = (id:string,status:ShopOrder['status']) => {
    const result = changeOrderTransaction(latest.current,id,status,actor)
    if (!result.error) commit(result.state)
    return result.error
  }
  const saveShop = (shop:SnackShop, creating = false) => {
    if (!session || (!creating && !latest.current.shops.some(s => s.id === shop.id && schoolOf(s) === session.schoolId))) return '无权管理此店铺。'
    const result = saveOwnedShop(latest.current.shops,{...shop,schoolId:session.schoolId},session,accounts,creating)
    if (!result.error) commit({...latest.current,shops:result.shops})
    return result.error
  }
  const moderateShop = (id:string,suspended:boolean) => {
    if (!session || !latest.current.shops.some(s => s.id === id && schoolOf(s) === session.schoolId)) return '无权调整其他学校的店铺。'
    const result = moderateOwnedShop(latest.current.shops,id,suspended,session,accounts)
    if (!result.error) commit({...latest.current,shops:result.shops})
    return result.error
  }
  return {...available(state),placeOrder,changeOrderStatus,canManageShop:permitted,managedShopId:permitted?ownShop?.id:undefined,saveShop,moderateShop}
}

