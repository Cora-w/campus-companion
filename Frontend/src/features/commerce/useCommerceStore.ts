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
  const permitted = canManageShop(session, accounts)
  const ownShop = state.shops.find(s => s.ownerId === session?.id)
  const actor = session ? {...session,canManageShop:permitted,shopId:permitted ? ownShop?.id : merchantShopIds[session.id]} : null
  const available = (current:CommerceState) => ({...current,shops:current.shops.map(s => s.adminSuspended || (s.ownerId && !accounts.some(a => a.id === s.ownerId && a.role === 'student' && a.enabled && a.shopManagement)) ? {...s,isOpen:false} : s)})
  const placeOrder = (order:ShopOrder) => {
    const result = placeOrderTransaction(available(latest.current),order,actor)
    if (!result.error) commit({...result.state,shops:latest.current.shops.map(s => ({...s,products:result.state.shops.find(next => next.id === s.id)!.products}))})
    return result.error
  }
  const changeOrderStatus = (id:string,status:ShopOrder['status']) => {
    const result = changeOrderTransaction(latest.current,id,status,actor)
    if (!result.error) commit(result.state)
    return result.error
  }
  const saveShop = (shop:SnackShop, creating = false) => {
    const result = saveOwnedShop(latest.current.shops,shop,session,accounts,creating)
    if (!result.error) commit({...latest.current,shops:result.shops})
    return result.error
  }
  const moderateShop = (id:string,suspended:boolean) => {
    const result = moderateOwnedShop(latest.current.shops,id,suspended,session,accounts)
    if (!result.error) commit({...latest.current,shops:result.shops})
    return result.error
  }
  return {...available(state),placeOrder,changeOrderStatus,canManageShop:permitted,managedShopId:permitted?ownShop?.id:undefined,saveShop,moderateShop}
}

