import { useState } from 'react'
import { Button, Popconfirm } from 'antd'
import { useCommerce } from './commerce'
import type { ShopOrder } from './commerce'

export function CancelSnackOrder({order}:{order:ShopOrder}) {
  const { changeOrderStatus } = useCommerce()
  const [error,setError] = useState('')
  return <>{order.status === '待接单' && <Popconfirm title="取消这笔订单？" description="商家尚未接单，取消后商品库存会恢复。" okText="确认取消" cancelText="再想想" onConfirm={() => setError(changeOrderStatus(order.id,'已取消'))}><Button className="spaced">取消订单</Button></Popconfirm>}{error && <p className="error-text" role="alert">{error}</p>}</>
}

