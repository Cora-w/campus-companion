import type { Account, Session } from '../../types/domain'
import type { SnackShop } from '../../data/snackData'

export function canManageShop(session: Session | null, accounts: Account[]) {
  return session?.role === 'student' && accounts.some(a => a.id === session.id && a.role === 'student' && a.enabled && a.shopManagement === true)
}

export function shopError(shop: SnackShop) {
  if (![shop.name, shop.location, shop.hours].every(value => value.trim())) return '请填写店铺名称、地点和营业时间。'
  if (shop.name.trim().length > 24 || shop.location.length > 80 || shop.hours.length > 40) return '店铺资料过长，请缩短后保存。'
  if (new Set(shop.products.map(p => p.id)).size !== shop.products.length) return '商品编号重复。'
  if (shop.products.some(p => !p.name.trim() || !p.category.trim() || !p.unit.trim() || !Number.isSafeInteger(p.price) || p.price < 1 || !Number.isSafeInteger(p.stock) || p.stock < 0)) return '请填写商品名称、分类、规格；价格至少 0.01 元，库存须为非负整数。'
  return ''
}

export function saveOwnedShop(shops: SnackShop[], candidate: SnackShop, session: Session | null, accounts: Account[], creating = false) {
  const fail = (error: string) => ({ shops, error })
  if (!session || !canManageShop(session, accounts)) return fail('你尚未获得开店权限，请联系管理员。')
  const current = shops.find(s => s.id === candidate.id)
  if (creating ? current || shops.some(s => s.ownerId === session.id) : !current || current.ownerId !== session.id) return fail('无权管理此店铺，或该账号已经创建店铺。')
  if (candidate.ownerId !== session.id) return fail('店铺所属账号不可修改。')
  const error = shopError(candidate)
  if (error) return fail(error)
  const next = { ...candidate, adminSuspended: current?.adminSuspended ?? false, isOpen: current?.adminSuspended ? current.isOpen : candidate.isOpen, name: candidate.name.trim(), location: candidate.location.trim(), hours: candidate.hours.trim(), avatar: candidate.name.trim().slice(0, 1) }
  return { error: '', shops: creating ? [...shops, next] : shops.map(s => s.id === next.id ? next : s) }
}

export function moderateOwnedShop(shops: SnackShop[], id: string, suspended: boolean, session: Session | null, accounts: Account[]) {
  if (session?.role !== 'admin' || !accounts.some(a => a.id === session.id && a.role === 'admin' && a.enabled)) return { shops, error: '无权调整店铺营业限制。' }
  if (!shops.some(s => s.id === id)) return { shops, error: '店铺不存在。' }
  return { shops: shops.map(s => s.id === id ? { ...s, adminSuspended: suspended } : s), error: '' }
}
