import { useRef, useState } from 'react'
import type { SetStateAction } from 'react'
import { merchantShopIds } from './commerce'
import type { ShopOrder } from './commerce'
import type { Session } from '../../data/data'
import { snackShops } from '../../data/snackData'
import type { SnackShop } from '../../data/snackData'
import { changeOrderTransaction, placeOrderTransaction } from './orderTransactions'
import type { CommerceState } from './orderTransactions'

export function useCommerceStore(session:Session|null) {
  const [state,setState] = useState<CommerceState>({shops:snackShops,orders:[]})
  // Event handlers commit to the same snapshot synchronously, including rapid clicks.
  const latest = useRef(state)
  const commit = (next:CommerceState) => { latest.current = next; setState(next) }
  const actor = session ? {...session,shopId:merchantShopIds[session.id]} : null
  const setShops = (update:SetStateAction<SnackShop[]>) => {
    const current = latest.current
    const shops = typeof update === 'function' ? update(current.shops) : update
    commit({...current,shops})
  }
  const placeOrder = (order:ShopOrder) => {
    const result = placeOrderTransaction(latest.current,order,actor)
    if (!result.error) commit(result.state)
    return result.error
  }
  const changeOrderStatus = (id:string,status:ShopOrder['status']) => {
    const result = changeOrderTransaction(latest.current,id,status,actor)
    if (!result.error) commit(result.state)
    return result.error
  }
  return {...state,setShops,placeOrder,changeOrderStatus}
}

