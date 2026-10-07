import { Drawer } from '../../navigation/BackOverlays'
import { CancelSnackOrder } from './CancelSnackOrder'
import { useCommerce } from './commerce'
import type { ShopOrder as Order } from './commerce'
import { uid } from '../../data/data'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { Button, Input } from 'antd'
import { Icon } from '../../components/shared/Shared'
import { snackPrice } from '../../data/snackData'
import type { SnackProduct } from '../../data/snackData'
import './SnackShops.css'


export function SnackShops({ open, shopId, selectShop, close }: { open: boolean; shopId: string | null; selectShop: (id: string | null) => void; close: () => void }) {
  const cartIcon = useRef<HTMLSpanElement>(null)
  const enteredFromDirectory = useRef(false)
  const [flights, setFlights] = useState<{ id: string; icon: string; x: number; y: number; dx: number; dy: number }[]>([])
  const [feedback, setFeedback] = useState<{ id: string; text: string } | null>(null)
  useEffect(() => { if (!feedback) return; const timer = setTimeout(() => setFeedback(null), 1500); return () => clearTimeout(timer) }, [feedback])
  useEffect(() => { if (!flights.length) return; const timer = setTimeout(() => setFlights([]), 1000); return () => clearTimeout(timer) }, [flights])
  const [carts, setCarts] = useState<Record<string, Record<string, number>>>({})
  const [mode, setMode] = useState('送货上门')
  const [address, setAddress] = useState('')
  const [recipient, setRecipient] = useState('')
  const [phone, setPhone] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [shopSearch, setShopSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [product, setProduct] = useState<SnackProduct | null>(null)
  const commerce = useCommerce()
  const snackShops = commerce.shops.map(s => ({ ...s, products:s.products.filter(p => p.active !== false) }))
  const orders = commerce.orders.filter(o => o.studentId === commerce.studentId)
  const submitted = useRef(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [placed, setPlaced] = useState<Order | null>(null)
  const shop = snackShops.find(s => s.id === shopId)
  const cart = carts[shopId || ''] || {}
  const lines = shop?.products.filter(p => cart[p.id] > 0) || []
  const count = lines.reduce((n, p) => n + cart[p.id], 0)
  const total = lines.reduce((n, p) => n + cart[p.id] * p.price, 0)
  const fee = mode === '送货上门' && count ? 300 : 0
  const payable = total + fee
  const change = (p: SnackProduct, delta: number, source?: HTMLElement) => {
    submitted.current = false
    if (!shop || (delta > 0 && (cart[p.id] || 0) >= p.stock)) return
    if (delta > 0) {
      setFeedback({ id: uid(), text: `${p.name}，装进小袋子啦` })
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        source?.animate([{ transform: 'scale(1)' }, { transform: 'scale(.78)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 300 })
        cartIcon.current?.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-12deg) scale(1.18)' }, { transform: 'rotate(9deg) scale(1.1)' }, { transform: 'rotate(0) scale(1)' }], { duration: 420, delay: cartOpen || product ? 0 : 420 })
        const start = source?.getBoundingClientRect()
        const end = cartIcon.current?.getBoundingClientRect()
        if (start && end && !cartOpen && !product) setFlights(prev => [...prev.slice(-7), { id: uid(), icon: p.icon, x: start.left + start.width / 2, y: start.top + start.height / 2, dx: end.left + end.width / 2 - start.left - start.width / 2, dy: end.top + end.height / 2 - start.top - start.height / 2 }])
      }
    }
    setCarts(prev => ({ ...prev, [shop.id]: { ...prev[shop.id], [p.id]: Math.max(0, Math.min(p.stock, (prev[shop.id]?.[p.id] || 0) + delta)) } }))
  }
  const enter = (id: string) => { enteredFromDirectory.current = true; selectShop(id); setCategory('全部'); setSearch(''); setPlaced(null) }
  const closeAll = () => { enteredFromDirectory.current = false; setFlights([]); setFeedback(null); setCategory('全部'); setSearch(''); setCartOpen(false); setProduct(null); setOrdersOpen(false); setPlaced(null); close() }
  const goBack = () => {
    if (shop && enteredFromDirectory.current) { selectShop(null); enteredFromDirectory.current = false; setCategory('全部'); setSearch(''); setPlaced(null); return }
    closeAll()
  }
  const quantity = (p: SnackProduct) => <div className="snack-quantity">{cart[p.id] > 0 && <><button aria-label={`减少${p.name}`} onClick={() => change(p, -1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg></button><span key={cart[p.id]} className="snack-count-pop" aria-label={`${p.name}数量`}>{cart[p.id]}</span></>}<button aria-label={`添加${p.name}`} disabled={(cart[p.id] || 0) >= p.stock} onClick={e => change(p, 1, e.currentTarget)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10"/></svg></button></div>
  const art = (p: SnackProduct) => <span className="snack-art" style={{ background: p.color }} aria-hidden="true">{p.icon}</span>
  const checkout = () => {
    if (!shop || !count || submitted.current) return
    if (mode === '送货上门' && (!address.trim() || !recipient.trim() || !/^1[3-9]\d{9}$/.test(phone.trim()))) { setCheckoutError('请填写收货人、11 位手机号及详细送达地址。'); return }
    setCheckoutError('')
    const order: Order = { shopId:shop.id, studentId:commerce.studentId, status:'待接单', id: 'SN' + uid(), shop: shop.name, items: lines.map(p => ({ productId:p.id, name: p.name, count: cart[p.id], price: p.price })), total: payable, fee, mode, address: mode === '送货上门' ? address.trim() : shop.location, recipient: mode === '送货上门' ? recipient.trim() : '', phone: mode === '送货上门' ? phone.trim() : '' }
    const error = commerce.placeOrder(order)
    if (error) { setCheckoutError(error); return }
    submitted.current = true
    setPlaced(order); setCarts(prev => ({ ...prev, [shop.id]: {} })); setCartOpen(false)
  }
  return <>{open && createPortal(<><div className="snack-feedback" role="status" aria-live="polite">{feedback && <span key={feedback.id}>✓ {feedback.text}</span>}</div>{flights.map(f => <span key={f.id} className="snack-flying-treat" aria-hidden="true" style={{ left: f.x, top: f.y, '--fly-x': `${f.dx}px`, '--fly-y': `${f.dy}px` } as CSSProperties} onAnimationEnd={() => setFlights(prev => prev.filter(item => item.id !== f.id))}>{f.icon}</span>)}</>, document.body)}<Drawer rootClassName={`snack-root ${shop ? 'snack-ordering' : 'snack-directory'}`} title={shop ? shop.name : '零食铺子'} placement="bottom" open={open} onClose={goBack} closeIcon={<Icon name="back"/>} destroyOnHidden>
    <div className="snack-topline"><span>{shop ? '店内选购' : '课间的小满足'}</span><button onClick={() => setOrdersOpen(true)}>我的订单 {orders.length > 0 ? orders.length : ''}</button></div>
    <p className="snack-demo">店铺与商品均为样例 · 暂不提供真实交易</p>
    {!shop ? <><div className="snack-directory-search"><Input aria-label="搜索零食店铺" placeholder="搜店铺、零食、饮料" prefix={<Icon name="search"/>} value={shopSearch} onChange={e=>setShopSearch(e.target.value)} allowClear/></div><div className="snack-service-strip"><b>校园零食，随手点</b><span>送货上门 · 到店自提</span></div><h3 className="snack-section-title">附近小店 <small>跑腿费 ¥3 / 单 · 演示价格</small></h3>{snackShops.filter(s => (s.name + s.products.map(p=>p.name).join('')).includes(shopSearch.trim())).map(s => <article className="snack-shop-card" key={s.id}><button className="snack-shop-heading" onClick={() => enter(s.id)} aria-label={`进入${s.name}`}><span className="snack-shop-avatar" style={{ background: s.color }}>{s.avatar}</span><span><b>{s.name}</b><small>{s.tagline}</small></span><Icon name="next"/></button><div className="snack-shop-preview">{s.products.slice(0, 3).map(p => <button key={p.id} onClick={() => { enter(s.id); setProduct(p) }}>{art(p)}<b>{p.name}</b><small>¥{snackPrice(p.price)}</small></button>)}</div><footer><span>配送 ¥3 · 支持自提</span><button onClick={() => enter(s.id)}>进店逛逛 →</button></footer></article>)}{!snackShops.some(s => (s.name + s.products.map(p=>p.name).join('')).includes(shopSearch.trim()))&&<p className="empty-copy">没有找到相关店铺或商品，换个词试试。</p>}</> : <>
      <header className="snack-store-hero"><span className="snack-shop-avatar" style={{background:shop.color}}>{shop.avatar}</span><div><h2>{shop.name}</h2><p>{shop.tagline}</p><small>{shop.hours} · 跑腿费 ¥3（演示）</small></div></header><div className="snack-location"><Icon name="location"/>{shop.location}</div>
      {placed && <div className="snack-order-success" role="status"><b>已生成演示订单</b><p>{placed.id} · ¥{snackPrice(placed.total)}</p><small>未付款、已同步本机商家演示端，不代表真实交易。</small><Button onClick={() => setOrdersOpen(true)}>查看订单</Button></div>}
      <Input aria-label="搜索店内商品" placeholder="想吃点什么？" value={search} onChange={e => setSearch(e.target.value)} allowClear/>
      <div className="snack-menu"><nav className="snack-categories" aria-label="商品分类">{['全部', ...new Set(shop.products.map(p => p.category))].map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</nav>
      <div className="snack-products" key={category + search}><h3 className="snack-category-title">{category === '全部' ? '全部商品' : category}</h3>{shop.products.filter(p => (category === '全部' || category === p.category) && p.name.includes(search.trim())).map(p => <article className="snack-product" key={p.id}><button className="snack-product-open" aria-label={`查看${p.name}`} onClick={() => setProduct(p)}>{art(p)}</button><div className="snack-product-copy"><button onClick={() => setProduct(p)}><h3>{p.name}</h3></button><small>{p.unit} · {p.stock ? `库存 ${p.stock}` : '已售罄'}</small><div><strong>¥{snackPrice(p.price)}</strong>{quantity(p)}</div></div></article>)}
      {!shop.products.some(p => (category === '全部' || category === p.category) && p.name.includes(search.trim())) && <p className="empty-copy">没有找到，换个关键词或分类试试。</p>}</div></div>
      <div className="snack-cart-bar"><button aria-label="查看购物车" onClick={() => setCartOpen(true)}><span ref={cartIcon} className="snack-cart-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 8h18l-2 12H5L3 8Zm4 0 3-5m7 5-3-5M9 12v4m6-4v4"/></svg><i>{count}</i></span><span><b>¥{snackPrice(total)}</b><small>{count ? `${count} 件商品 · 配送另加 ¥3 / 自提免跑腿费` : '选点喜欢的零食吧'}</small></span></button><Button type="primary" disabled={!count} onClick={() => setCartOpen(true)}>去结算</Button></div>
    </>}
    </Drawer>
    <Drawer rootClassName="snack-overlay" closeIcon={<Icon name="back"/>} title="商品详情" placement="bottom" open={open && !!product} onClose={() => setProduct(null)} destroyOnHidden>{product && <div className="snack-product-detail">{art(product)}<h2>{product.name}</h2><p>{product.unit}</p><p>{product.note}</p><div className="snack-detail-buy"><strong>¥{snackPrice(product.price)}</strong>{product.stock ? quantity(product) : <span>已售罄</span>}</div><Button block className="spaced" onClick={() => setProduct(null)}>继续选购</Button></div>}</Drawer>
    <Drawer rootClassName="snack-overlay" closeIcon={<Icon name="back"/>} title="购物车与结算" placement="bottom" open={open && cartOpen && !!shop} onClose={() => setCartOpen(false)} destroyOnHidden><h3>{shop?.name}</h3>{!count ? <p className="empty-copy">购物车还是空的，去挑点喜欢的吧。</p> : <>{lines.map(p => <div className="snack-cart-line" key={p.id}><div><b>{p.name}</b><small>¥{snackPrice(p.price)} / 件</small></div>{quantity(p)}</div>)}<div className="snack-total"><button onClick={() => setCarts(prev => ({ ...prev, [shop!.id]: {} }))}>清空购物车</button><strong>合计 ¥{snackPrice(total)}</strong></div><div className="snack-fulfillment"><div className="snack-mode" role="group" aria-label="收货方式">{['送货上门','到店自提'].map(m=><button key={m} aria-pressed={mode===m} className={mode===m?'selected':''} onClick={()=>{setMode(m);setCheckoutError('')}}>{m}</button>)}</div>{mode==='送货上门'?<div className="snack-address"><label>收货人<Input aria-label="收货人" value={recipient} maxLength={30} onChange={e=>setRecipient(e.target.value)} placeholder="填写姓名"/></label><label>联系电话<Input aria-label="联系电话" type="tel" value={phone} maxLength={11} onChange={e=>setPhone(e.target.value)} placeholder="11 位手机号"/></label><label>送达地址<Input.TextArea aria-label="送达地址" value={address} maxLength={150} onChange={e=>setAddress(e.target.value)} placeholder="校区、宿舍楼、楼层及房间号" rows={2}/></label><small>校内配送，暂按每单 ¥3 演示。</small></div>:<div className="snack-pickup"><b>自提地点</b><p>{shop?.location}</p><small>到店自提免跑腿费</small></div>}</div><div className="snack-fees"><p>商品金额<span>¥{snackPrice(total)}</span></p><p>跑腿费<span>¥{snackPrice(fee)}</span></p><p><b>应付合计</b><strong>¥{snackPrice(payable)}</strong></p></div>{checkoutError&&<p role="alert" className="error-text">{checkoutError}</p>}<p className="snack-demo">演示结算，不付款、不派单；可填写测试信息体验。</p><Button block type="primary" onClick={checkout}>提交演示订单 · ¥{snackPrice(payable)}</Button></>}</Drawer>
    <Drawer rootClassName="snack-overlay" closeIcon={<Icon name="back"/>} title="我的零食订单" placement="bottom" open={open && ordersOpen} onClose={() => setOrdersOpen(false)} destroyOnHidden>{!orders.length ? <p className="empty-copy">还没有订单，先去逛逛小店吧。</p> : orders.map(o => <article className="snack-order" key={o.id}><h3>{o.shop}</h3><small>{o.id} · {o.status} · 演示未支付</small>{o.items.map(p => <p key={p.name}>{p.name} × {p.count}<span>¥{snackPrice(p.price * p.count)}</span></p>)}<p>{o.mode}<span>跑腿费 ¥{snackPrice(o.fee)}</span></p><p>{o.address}</p>{o.recipient&&<p>{o.recipient} · {o.phone}</p>}<strong>合计 ¥{snackPrice(o.total)}</strong><CancelSnackOrder order={o}/><p className="snack-demo">已同步本机商家演示端，不代表真实交易。刷新后记录重置。</p></article>)}</Drawer>
  </>
}

