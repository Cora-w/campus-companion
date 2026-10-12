import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SnackShop } from '../../data/snackData'
export type ShopOrder = { id:string; shopId:string; studentId:string; shop:string; items:{productId:string;name:string;count:number;price:number}[]; total:number;fee:number;mode:string;address:string;recipient:string;phone:string;status:'待接单'|'备货中'|'配送中'|'待自提'|'已完成'|'已取消' }
export type Promotion = { enabled:boolean; title:string }
export const CommerceContext = createContext<{ shops:SnackShop[];orders:ShopOrder[];placeOrder:(order:ShopOrder)=>string;changeOrderStatus:(id:string,status:ShopOrder['status'])=>string;promotion:Promotion;setPromotion:Dispatch<SetStateAction<Promotion>>;studentId:string;canManageShop:boolean;managedShopId?:string;saveShop:(shop:SnackShop,creating?:boolean)=>string;moderateShop:(id:string,suspended:boolean)=>string } | null>(null)
export function useCommerce() { const value=useContext(CommerceContext);if(!value)throw new Error('Missing commerce provider');return value }
export const merchantShopIds:Record<string,string> = { 'M-DEMO-01':'afterclass', 'M-DEMO-02':'littlebread' }

