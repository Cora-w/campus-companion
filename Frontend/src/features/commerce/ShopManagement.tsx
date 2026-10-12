import { useState } from 'react'
import { Alert, Button, Input, InputNumber, Switch, Tag } from 'antd'
import { Drawer } from '../../navigation/BackOverlays'
import { Icon, Sheet } from '../../components/shared/Shared'
import { uid } from '../../data/data'
import { snackPrice } from '../../data/snackData'
import type { SnackProduct, SnackShop } from '../../data/snackData'
import { useCommerce } from './commerce'
import type { ShopOrder } from './commerce'
import './ShopManagement.css'

export function ShopManagement({ open, close }: { open: boolean; close: () => void }) {
  const commerce = useCommerce()
  const shop = commerce.shops.find(s => s.id === commerce.managedShopId)
  const [tab, setTab] = useState('店铺')
  const [draft, setDraft] = useState({ name: shop?.name || '', location: shop?.location || '', hours: shop?.hours || '09:00–22:00', tagline: shop?.tagline || '' })
  const [product, setProduct] = useState<SnackProduct | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('全部')
  const ownOrders = commerce.orders.filter(o => o.shopId === shop?.id)
  const save = (next: SnackShop, creating = false) => {
    const result = commerce.saveShop(next, creating)
    setError(result)
    if (!result) setNotice(creating ? '店铺已创建，可以添加商品了。' : '修改已保存，零食铺子同步更新。')
    return !result
  }
  const saveDetails = () => {
    const candidate: SnackShop = shop ? { ...shop, ...draft } : { ...draft, id: 'student-shop-' + uid(), ownerId: commerce.studentId, avatar: draft.name.slice(0, 1), color: '#e3e8cf', isOpen: true, products: [] }
    if (save(candidate, !shop)) setTab('商品')
  }
  const saveProduct = () => {
    if (!product || !shop) return
    const next = { ...product, name: product.name.trim(), category: product.category.trim(), unit: product.unit.trim(), note: product.note.trim() }
    if (save({ ...shop, products: shop.products.some(p => p.id === next.id) ? shop.products.map(p => p.id === next.id ? next : p) : [...shop.products, next] })) setProduct(null)
  }
  const updateOrder = (order: ShopOrder, status: ShopOrder['status']) => {
    const result = commerce.changeOrderStatus(order.id, status)
    setError(result)
    if (!result) setNotice(status === '已取消' ? '订单已拒绝，商品库存已恢复。' : '订单进度已更新。')
  }
  if (!commerce.canManageShop) return null
  return <Drawer open={open} onClose={close} placement="right" size="min(480px, 100vw)" title="管理店铺" className="shop-management" destroyOnHidden>
    <div className="shop-management-intro"><span className="profile-icon"><Icon name="food"/></span><div><h2>{shop?.name || '创建我的小卖部'}</h2><p>{shop ? '管理商品、订单与营业信息' : '填写店铺信息，开始经营校园小店'}</p></div></div>
    {notice && <Alert type="success" role="status" title={notice} closable onClose={() => setNotice('')}/>}
    {shop?.adminSuspended && <Alert type="warning" title="店铺已被管理员暂停营业" description="暂不接受新订单，可继续维护商品和处理已有订单。恢复营业请联系管理员。"/>}
    {error && !product && <Alert type="error" role="alert" title={error}/>}
    {shop && <><div className="shop-management-stats"><div><b>{shop.products.filter(p => p.active !== false).length}</b><small>在售商品</small></div><div><b>{ownOrders.filter(o => o.status === '待接单').length}</b><small>待接订单</small></div><div><b>¥{snackPrice(ownOrders.filter(o => o.status === '已完成').reduce((sum, o) => sum + o.total - o.fee, 0))}</b><small>已完成商品金额</small></div></div><nav className="shop-management-tabs" aria-label="店铺管理导航">{['店铺', '商品', '订单'].map(value => <button key={value} aria-current={tab === value ? 'page' : undefined} className={tab === value ? 'active' : ''} onClick={() => { setTab(value); setError('') }}>{value}</button>)}</nav></>}
    {(!shop || tab === '店铺') && <form className="shop-management-card shop-management-form" onSubmit={e => { e.preventDefault(); saveDetails() }}>
      <label htmlFor="my-shop-name">店铺名称</label><Input id="my-shop-name" maxLength={24} placeholder="给你的小卖部起个名字" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/>
      <label htmlFor="my-shop-location">店铺地点 / 自提点</label><Input id="my-shop-location" maxLength={80} placeholder="例如：第一食堂旁 03 号铺" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })}/>
      <label htmlFor="my-shop-hours">营业时间</label><Input id="my-shop-hours" maxLength={40} value={draft.hours} onChange={e => setDraft({ ...draft, hours: e.target.value })}/>
      <label htmlFor="my-shop-tagline">店铺介绍</label><Input.TextArea id="my-shop-tagline" maxLength={120} rows={3} value={draft.tagline} onChange={e => setDraft({ ...draft, tagline: e.target.value })}/>
      {shop && <div className="shop-management-row"><span>营业中</span><Switch aria-label="店铺营业状态" disabled={shop.adminSuspended} checked={shop.isOpen !== false} onChange={isOpen => save({ ...shop, isOpen })}/></div>}
      <Button type="primary" htmlType="submit" block>{shop ? '保存店铺资料' : '创建店铺'}</Button>
    </form>}
    {shop && tab === '商品' && <><div className="shop-management-row"><h3>本店商品</h3><Button type="primary" onClick={() => { setError(''); setProduct({ id: uid(), name: '', category: '零食', unit: '1 袋', price: 100, stock: 0, note: '', icon: '🍬', color: '#f6dfcf', active: true }) }}>新增商品</Button></div>{shop.products.map(p => <article className="shop-management-card" key={p.id}><div className="shop-management-row"><div><h3>{p.icon} {p.name}</h3><p>¥{snackPrice(p.price)} · {p.unit} · 库存 {p.stock}</p></div><Switch aria-label={`上架 ${p.name}`} checked={p.active !== false} onChange={active => save({ ...shop, products: shop.products.map(value => value.id === p.id ? { ...value, active } : value) })}/></div><div className="shop-management-row"><Tag>{p.active === false ? '已下架' : p.stock ? '在售' : '售罄'}</Tag><Button aria-label={`编辑商品 ${p.name}`} onClick={() => { setError(''); setProduct({ ...p }) }}>编辑</Button></div></article>)}{!shop.products.length && <p className="shop-management-empty">还没有商品，点击“新增商品”上架第一件。</p>}</>}
    {shop && tab === '订单' && <><div className="shop-management-filters">{['全部', '待接单', '备货中', '配送中', '待自提', '已完成', '已取消'].map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div>{ownOrders.filter(o => filter === '全部' || o.status === filter).map(o => <article className="shop-management-card" key={o.id}><div className="shop-management-row"><Tag>{o.status}</Tag><b>{o.mode}</b></div><small>{o.id}</small>{o.items.map(i => <p key={i.productId}>{i.name} × {i.count} · ¥{snackPrice(i.price * i.count)}</p>)}<p>合计 ¥{snackPrice(o.total)}（配送费 ¥{snackPrice(o.fee)}）</p><p>{o.address}</p>{o.recipient && <p>{o.recipient} · {o.phone}</p>}<div className="shop-management-actions">{o.status === '待接单' && <><Button type="primary" onClick={() => updateOrder(o, '备货中')}>接单备货</Button><Button onClick={() => updateOrder(o, '已取消')}>拒绝订单</Button></>}{o.status === '备货中' && <Button type="primary" onClick={() => updateOrder(o, o.mode === '送货上门' ? '配送中' : '待自提')}>{o.mode === '送货上门' ? '开始配送' : '准备好自提'}</Button>}{['配送中', '待自提'].includes(o.status) && <Button type="primary" onClick={() => updateOrder(o, '已完成')}>完成订单</Button>}</div></article>)}{!ownOrders.some(o => filter === '全部' || o.status === filter) && <p className="shop-management-empty">暂无匹配的订单。</p>}</>}
    <p className="shop-management-note">本地演示：店铺与订单在本次访问内联动，刷新后恢复样例。</p>
    <Sheet open={!!product} onClose={() => { setProduct(null); setError('') }} title="编辑商品" fullScreen footer={<Button block type="primary" onClick={saveProduct}>保存商品</Button>}>
      {product && <div className="shop-management-form"><label htmlFor="my-product-name">商品名称</label><Input id="my-product-name" maxLength={40} value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })}/><label htmlFor="my-product-category">分类</label><Input id="my-product-category" maxLength={16} value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })}/><label htmlFor="my-product-unit">规格</label><Input id="my-product-unit" maxLength={30} value={product.unit} onChange={e => setProduct({ ...product, unit: e.target.value })}/><label htmlFor="my-product-price">单价（元）</label><InputNumber id="my-product-price" min={0.01} max={99999} precision={2} value={product.price / 100} onChange={value => setProduct({ ...product, price: value === null ? 0 : Math.round(value * 100) })}/><label htmlFor="my-product-stock">库存（件）</label><InputNumber id="my-product-stock" min={0} max={999999} precision={0} value={product.stock} onChange={value => setProduct({ ...product, stock: value ?? -1 })}/><label htmlFor="my-product-note">商品说明</label><Input.TextArea id="my-product-note" rows={3} maxLength={200} value={product.note} onChange={e => setProduct({ ...product, note: e.target.value })}/>{error && <p role="alert" className="error-text">{error}</p>}</div>}
    </Sheet>
  </Drawer>
}
