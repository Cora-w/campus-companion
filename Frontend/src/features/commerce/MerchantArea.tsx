import { useState } from 'react'
import { Button, Input, InputNumber, Switch, Tag } from 'antd'
import { useCommerce, merchantShopIds } from './commerce'
import type { ShopOrder } from './commerce'
import type { Session } from '../../data/data'
import { uid } from '../../data/data'
import { snackPrice } from '../../data/snackData'
import type { SnackProduct } from '../../data/snackData'
import { Sheet } from '../../components/shared/Shared'
import './MerchantArea.css'
export type MerchantPage = 'merchant-home' | 'merchant-products' | 'merchant-orders' | 'merchant-promotion' | 'profile'
export function MerchantArea({page,session,logout,go}:{page:MerchantPage;session:Session;logout:()=>void;go:(page:MerchantPage)=>void}) {
 const {shops,setShops,orders,changeOrderStatus,promotion,setPromotion}=useCommerce()
 const shop=shops.find(s=>s.id===merchantShopIds[session.id])
 const [editing,setEditing]=useState<SnackProduct|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [filter,setFilter]=useState('全部')
 const [shopDraft,setShopDraft]=useState(shop ? {name:shop.name,tagline:shop.tagline,location:shop.location,hours:shop.hours} : {name:'',tagline:'',location:'',hours:''})
 const [adTitle,setAdTitle]=useState(promotion.title)
 if(!shop)return <div className="empty"><p>该商家账号尚未绑定店铺，请联系管理员。</p><Button onClick={logout}>退出当前身份</Button></div>
 const ownOrders=orders.filter(o=>o.shopId===shop.id)
 const updateStatus=(id:string,status:ShopOrder['status'])=>setNotice(changeOrderStatus(id,status) || (status==='已取消'?'已拒绝订单，库存已恢复。':'订单状态已更新。'))
 const saveProduct=()=>{
  if(!editing)return
  if(!editing.name.trim()||!editing.unit.trim()||!editing.category.trim()||!Number.isInteger(editing.price)||editing.price<1||!Number.isInteger(editing.stock)||editing.stock<0){setError('请填写名称、规格、分类；价格至少 0.01 元，库存为非负整数。');return}
  const product={...editing,name:editing.name.trim(),unit:editing.unit.trim(),category:editing.category.trim()}
  setShops(prev=>prev.map(s=>s.id===shop.id?{...s,products:s.products.some(p=>p.id===product.id)?s.products.map(p=>p.id===product.id?product:p):[product,...s.products]}:s));setEditing(null);setNotice('商品已保存，学生端同步更新。')
 }
 return <div className="merchant-area"><p className="merchant-scope">{shop.name} · 商家演示账户</p>{notice&&<p role="status" className="merchant-notice">{notice}</p>}
 {page==='merchant-home'&&<><section className="merchant-hero"><small>我的校园小店</small><h2>今天也好好经营。</h2><p>{shop.name}</p><Tag>店铺已绑定</Tag></section><div className="merchant-stats"><button onClick={()=>{setFilter('待接单');go('merchant-orders')}}><b>{ownOrders.filter(o=>o.status==='待接单').length}</b><span>待接订单</span></button><button onClick={()=>go('merchant-products')}><b>{shop.products.filter(p=>p.active!==false).length}</b><span>在售商品</span></button><div><b>¥{snackPrice(ownOrders.filter(o=>o.status==='已完成').reduce((n,o)=>n+o.total,0))}</b><span>已完成演示金额</span></div></div><section className="merchant-card"><h3>经营入口</h3><Button block onClick={()=>go('merchant-products')}>商品上架、改价与库存</Button><Button block onClick={()=>{setFilter('全部');go('merchant-orders')}}>查看本店订单</Button><Button block onClick={()=>go('merchant-promotion')}>首页推广位</Button></section><p className="demo-note">本机跨身份联动演示，未支付、未派单；刷新后恢复样例。</p></>}
 {page==='merchant-products'&&<><div className="row"><h2>本店商品</h2><Button type="primary" onClick={()=>{setEditing({id:uid(),name:'',category:'零食',price:100,unit:'1 袋',stock:10,note:'',icon:'🍬',color:'#f6dfcf',active:true});setError('')}}>新增商品</Button></div>{shop.products.map(p=><article className="merchant-card" key={p.id}><div className="row"><div><h3>{p.icon} {p.name}</h3><p>¥{snackPrice(p.price)} · {p.unit} · 库存 {p.stock}</p></div><Switch aria-label={`上架${p.name}`} checked={p.active!==false} onChange={active=>setShops(prev=>prev.map(s=>s.id===shop.id?{...s,products:s.products.map(x=>x.id===p.id?{...x,active}:x)}:s))}/></div><div className="row"><Tag>{p.active===false?'已下架':p.stock?'在售':'售罄'}</Tag><Button onClick={()=>{setEditing({...p});setError('')}}>编辑{p.name}</Button></div></article>)}</>}
 {page==='merchant-orders'&&<><h2>订单管理</h2><div className="merchant-filters">{['全部','待接单','备货中','配送中','待自提','已完成','已取消'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div>{ownOrders.filter(o=>filter==='全部'||o.status===filter).map(o=><article className="merchant-card" key={o.id}><div className="row"><Tag>{o.status}</Tag><b>{o.mode}</b></div><small>{o.id}</small>{o.items.map((i,n)=><p key={n}>{i.name} × {i.count}<span className="merchant-price">¥{snackPrice(i.price*i.count)}</span></p>)}<p>跑腿费 ¥{snackPrice(o.fee)} · 合计 ¥{snackPrice(o.total)}</p><p>{o.address}</p>{o.recipient&&<p>{o.recipient} · {o.phone}</p>}<div className="detail-tools">{o.status==='待接单'&&<><Button type="primary" onClick={()=>updateStatus(o.id,'备货中')}>接单备货</Button><Button onClick={()=>updateStatus(o.id,'已取消')}>拒绝订单</Button></>}{o.status==='备货中'&&<Button type="primary" onClick={()=>updateStatus(o.id,o.mode==='送货上门'?'配送中':'待自提')}>{o.mode==='送货上门'?'开始配送':'通知可自提（演示）'}</Button>}{['配送中','待自提'].includes(o.status)&&<Button type="primary" onClick={()=>updateStatus(o.id,'已完成')}>{o.status==='配送中'?'确认送达（演示）':'确认已取货（演示）'}</Button>}</div></article>)}{!ownOrders.some(o=>filter==='全部'||o.status===filter)&&<p className="empty">暂无相关订单。学生端提交的本店演示订单会显示在这里。</p>}</>}
 {page==='merchant-promotion'&&<section className="merchant-card"><h2>首页商家推广</h2>{shop.id==='afterclass'?<><p>学生首页轮播位，明确标注“广告 · 商家推广”。点击进入本店。</p><label>推广标题<Input aria-label="推广标题" value={adTitle} maxLength={24} onChange={e=>setAdTitle(e.target.value)}/></label><Button type="primary" disabled={!adTitle.trim()} onClick={()=>{setPromotion(prev=>({...prev,title:adTitle.trim()}));setNotice('推广文案已更新。')}}>保存推广文案</Button><div className="row spaced"><span>展示演示推广位</span><Switch aria-label="展示演示推广位" checked={promotion.enabled} onChange={enabled=>setPromotion(prev=>({...prev,enabled}))}/></div></>:<p>本店暂无分配的演示推广位。</p>}<p className="demo-note">当前不收取推广费。充值、投放审核与真实广告计费尚未接入。</p></section>}
 {page==='profile'&&<><form className="merchant-card" onSubmit={e=>{e.preventDefault();if(Object.values(shopDraft).some(v=>!v.trim())){setNotice('请完整填写店铺信息。');return}setShops(prev=>prev.map(s=>s.id===shop.id?{...s,...shopDraft}:s));setNotice('店铺资料已保存，学生端同步更新。')}}><h2>店铺资料</h2>{([['name','店铺名称'],['tagline','店铺简介'],['location','店铺地址'],['hours','营业时间']] as const).map(([key,label])=><label key={key}>{label}<Input aria-label={label} maxLength={key==='location'?100:40} value={shopDraft[key]} onChange={e=>setShopDraft(prev=>({...prev,[key]:e.target.value}))}/></label>)}<Button htmlType="submit" type="primary" block>保存店铺资料</Button></form><p className="subtle">商家账号：{session.id}<br/>仅管理绑定店铺的商品、订单与资料。</p><Button block onClick={logout}>退出当前身份</Button></>}
 <Sheet title={editing?'编辑商品':'商品'} open={!!editing} onClose={()=>setEditing(null)}>{editing&&<form className="merchant-editor" onSubmit={e=>{e.preventDefault();saveProduct()}}>{([['name','商品名称'],['category','商品分类'],['unit','商品规格'],['note','商品说明']] as const).map(([key,label])=><label key={key}>{label}<Input aria-label={label} maxLength={key==='note'?200:40} value={editing[key]} onChange={e=>setEditing({...editing,[key]:e.target.value})}/></label>)}<label>价格（元）<InputNumber aria-label="商品价格" min={0.01} precision={2} value={editing.price/100} onChange={v=>setEditing({...editing,price:v===null?0:Math.round(v*100)})}/></label><label>库存<InputNumber aria-label="商品库存" min={0} precision={0} value={editing.stock} onChange={v=>setEditing({...editing,stock:v??0})}/></label>{error&&<p role="alert" className="error-text">{error}</p>}<Button block type="primary" htmlType="submit">保存商品</Button></form>}</Sheet>
 </div>
}

