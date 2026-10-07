import { Drawer } from '../../navigation/BackOverlays'
import { useRef, useState } from 'react'
import { Button, Input, Radio } from 'antd'
import type { MarketItem } from '../../data/hubData'
import { sellerName } from '../../data/hubSocialData'
import { Person } from '../messages/HubSocial'
import { Icon } from '../../components/shared/Shared'
import './MarketCheckout.css'

type Status = '待付款' | '待发货' | '待收货' | '已完成' | '已取消' | '退款处理中' | '已退款'
type Order = { id:string; item:MarketItem; delivery:string; address:string; recipient:string; phone:string; method:string; total:number; status:Status }
type Props = { item:MarketItem|null; ordersOpen:boolean; close:()=>void; available:(id:string)=>boolean; updateItem:(id:string,status:MarketItem['status'],reserved:boolean)=>void; contact:(item:MarketItem)=>void }
export function MarketCheckout({item,ordersOpen,close,available,updateItem,contact}:Props) {
 const [orders,setOrders]=useState<Order[]>([])
 const [current,setCurrent]=useState<string|null>(null)
 const [delivery,setDelivery]=useState('校内无接触交付')
 const [address,setAddress]=useState('')
 const [recipient,setRecipient]=useState('')
 const [phone,setPhone]=useState('')
 const [method,setMethod]=useState('微信支付')
 const [error,setError]=useState('')
 const lock=useRef(false)
 const order=orders.find(o=>o.id===current)
 const fee=delivery==='快递寄送'?6:0
 const dismiss=()=>{if(order&&ordersOpen&&!item){setCurrent(null);setError('');return}close();setCurrent(null);setError('');setAddress('');setRecipient('');setPhone('');lock.current=false}
 const submit=()=>{
  if(lock.current||!item)return
  if(!recipient.trim()||!/^1[3-9]\d{9}$/.test(phone)||address.trim().length<5){setError('请填写收件人、有效手机号和完整收件地址（至少 5 个字）。');return}
  if(!available(item.id)){setError('这件物品已不可购买，请返回查看最新状态。');return}
  lock.current=true
  const next:Order={id:'DEMO-'+Date.now(),item:{...item},delivery,address:address.trim(),recipient:recipient.trim(),phone,method,total:Math.round((item.price+fee)*100)/100,status:'待付款'}
  setOrders(prev=>[next,...prev]);setCurrent(next.id);updateItem(item.id,'已预订',true);setError('')
 }
 const transition=(next:Status)=>{
  if(!order)return
  const allowed:Record<Status,Status[]>={'待付款':['待发货','已取消'],'待发货':['待收货','退款处理中'],'待收货':['已完成','退款处理中'],'已完成':[],'已取消':[],'退款处理中':['已退款'],'已退款':[]}
  if(!allowed[order.status].includes(next))return
  setError('');setOrders(prev=>prev.map(o=>o.id===order.id?{...o,status:next}:o))
  updateItem(order.item.id,next==='已取消'||next==='已退款'?'在售':next==='待付款'?'已预订':'已售出',!['已取消','已退款'].includes(next))
 }
 return <Drawer rootClassName="market-checkout-root" placement="bottom" open={!!item||ordersOpen} title={order?'订单详情':item?'确认订单':'我的购买'} closeIcon={<Icon name="back"/>} onClose={dismiss}>
  <p className="checkout-demo">前端演示 · 不会扣款或通知卖家，订单仅保留在本次体验</p>
  {order?<>
   <section className="checkout-status"><span>订单状态</span><h2>{order.status}</h2><p>{({'待付款':'物品已为本订单保留，请完成支付或取消订单。','待发货':'已模拟支付成功，等待卖家安排交付。','待收货':'请实际检查物品后再确认收货。','已完成':'已模拟确认收货；真实卖家结算由支付服务处理。','已取消':'订单已取消，未产生扣款。','退款处理中':'退款申请已提交（演示），等待处理结果。','已退款':'已模拟退款完成，物品重新上架。'})[order.status]}</p></section>
   <section className="checkout-card"><Person name={sellerName(order.item)}/><h3>{order.item.title}</h3><strong className="item-price">¥{order.total.toFixed(2)}</strong><p>{order.delivery} · {order.method}</p><p>{order.recipient} · {order.phone}</p><p>{order.address}</p><small>订单编号：{order.id}</small></section>
   <Button onClick={()=>contact(order.item)}>联系卖家</Button>
   {order.status==='待付款'&&<Button type="text" onClick={()=>setError('模拟支付失败，订单仍待付款，可重试或取消。')}>模拟支付失败</Button>}
   {error&&<p role="alert" className="error-text">{error}</p>}
   <div className="checkout-footer">
    {order.status==='待付款'&&<><Button onClick={()=>transition('已取消')}>取消订单</Button><Button type="primary" onClick={()=>transition('待发货')}>模拟支付成功</Button></>}
    {order.status==='待发货'&&<><Button onClick={()=>transition('退款处理中')}>申请退款</Button><Button type="primary" onClick={()=>transition('待收货')}>模拟卖家发货</Button></>}
    {order.status==='待收货'&&<><Button onClick={()=>transition('退款处理中')}>申请退款</Button><Button type="primary" onClick={()=>{if(window.confirm('确认已经收到物品并检查无误？'))transition('已完成')}}>确认收货</Button></>}
    {order.status==='退款处理中'&&<Button type="primary" onClick={()=>transition('已退款')}>模拟退款完成</Button>}
   </div>
  </>:item?<>
   <section className="checkout-card"><Person name={sellerName(item)}/><h3>{item.title}</h3><strong className="item-price">¥{item.price.toFixed(2)}</strong></section>
   <section className="checkout-card"><h3>交付方式</h3><Radio.Group value={delivery} onChange={e=>setDelivery(e.target.value)} options={['校内无接触交付','快递寄送']}/><p className="checkout-note">样例支持以上方式。无接触交付的放置地点与时间可通过私信确认。</p><label>收件人<Input aria-label="收件人" value={recipient} maxLength={30} onChange={e=>setRecipient(e.target.value)} placeholder="填写姓名"/></label><label>手机号<Input aria-label="收件手机号" inputMode="tel" value={phone} maxLength={11} onChange={e=>setPhone(e.target.value)} placeholder="用于交付联系"/></label><label>{delivery==='快递寄送'?'完整收件地址':'校内收件地点'}<Input.TextArea aria-label="收件地址" value={address} maxLength={150} autoSize={{minRows:2,maxRows:3}} onChange={e=>setAddress(e.target.value)} placeholder={delivery==='快递寄送'?'省市区、学校、楼栋及门牌':'例如：二号宿舍一楼指定收件处'}/></label></section>
   <section className="checkout-card"><h3>支付方式</h3><Radio.Group value={method} onChange={e=>setMethod(e.target.value)} options={['微信支付','支付宝']}/><p className="checkout-note">支付渠道尚未接入，下一步仅预览付款结果。</p></section>
   <div className="checkout-cost"><span>商品金额</span><b>¥{item.price.toFixed(2)}</b><span>配送费（样例）</span><b>¥{fee.toFixed(2)}</b></div>
   {error&&<p role="alert" className="error-text">{error}</p>}
   <div className="checkout-footer"><span>合计 <strong>¥{(item.price+fee).toFixed(2)}</strong></span><Button type="primary" onClick={submit}>提交订单</Button></div>
  </>:<>{!orders.length&&<p className="empty-copy">还没有购买订单，去挑一件喜欢的闲置吧。</p>}{orders.map(o=><button className="checkout-order" key={o.id} onClick={()=>setCurrent(o.id)}><span>{o.status}</span><h3>{o.item.title}</h3><p>¥{o.total.toFixed(2)} · {o.delivery}</p><small>查看订单 →</small></button>)}</>}
 </Drawer>
}

