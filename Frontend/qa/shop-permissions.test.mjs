import assert from 'node:assert/strict'
import { canManageShop, saveOwnedShop, moderateOwnedShop } from '../src/features/commerce/shopPermissions.ts'
import { placeOrderTransaction, changeOrderTransaction } from '../src/features/commerce/orderTransactions.ts'

const session = { id: 'student-a', name: '学生 A', role: 'student' }
const account = { ...session, enabled: true, shopManagement: true }
const shop = { id: 'owned-shop', ownerId: session.id, name: '校园小卖部', location: '食堂旁', hours: '09:00–22:00', tagline: '', avatar: '校', color: '#fff', products: [{ id: 'tea', name: '茶', category: '饮品', unit: '1 瓶', price: 500, stock: 3, icon: '🍵', color: '#fff', note: '' }] }
assert.equal(canManageShop(session, [account]), true)
for (const changed of [{ shopManagement: false }, { enabled: false }, { role: 'teacher' }]) assert.equal(canManageShop(session, [{ ...account, ...changed }]), false)
assert.ok(saveOwnedShop([], shop, session, [{ ...account, shopManagement: false }], true).error)
assert.equal(saveOwnedShop([], shop, session, [account], true).error, '')
assert.ok(saveOwnedShop([shop], { ...shop, id: 'second' }, session, [account], true).error)
assert.ok(saveOwnedShop([shop], { ...shop, ownerId: 'another' }, session, [account]).error)
assert.ok(saveOwnedShop([shop], { ...shop, ownerId: 'another' }, { ...session, id: 'another' }, [{ ...account, id: 'another' }]).error)
assert.ok(saveOwnedShop([shop], { ...shop, products: [{ ...shop.products[0], stock: -1 }] }, session, [account]).error)
const order = { id: 'order-1', shopId: shop.id, shop: shop.name, studentId: 'buyer', items: [{ productId: 'tea', name: '茶', count: 1, price: 500 }], total: 500, fee: 0, mode: '到店自提', address: shop.location, recipient: '', phone: '', status: '待接单' }
const buyer = { id: 'buyer', role: 'student' }
const initial = { shops: [shop], orders: [] }
assert.ok(placeOrderTransaction({ ...initial, shops: [{ ...shop, isOpen: false }] }, order, buyer).error)
const placed = placeOrderTransaction(initial, order, buyer)
assert.equal(placed.error, '')
assert.equal(placed.state.shops[0].products[0].stock, 2)
const actor = { ...session, shopId: shop.id, canManageShop: true }
assert.ok(changeOrderTransaction(placed.state, order.id, '备货中', { ...actor, canManageShop: false }).error)
assert.ok(changeOrderTransaction(placed.state, order.id, '备货中', { ...actor, id: 'another' }).error)
const accepted = changeOrderTransaction(placed.state, order.id, '备货中', actor)
assert.equal(accepted.error, '')
assert.equal(changeOrderTransaction(accepted.state, order.id, '待自提', actor).error, '')
const canceled = changeOrderTransaction(placed.state, order.id, '已取消', actor)
assert.equal(canceled.error, '')
assert.equal(canceled.state.shops[0].products[0].stock, 3)
assert.ok(changeOrderTransaction(canceled.state, order.id, '已取消', actor).error)
console.log('Shop permissions, ownership, inventory and order checks passed')
const admin = { id: 'admin', name: '管理员', role: 'admin' }
const accounts = [account, { ...admin, enabled: true }]
assert.ok(moderateOwnedShop([shop], shop.id, true, session, accounts).error)
assert.ok(moderateOwnedShop([shop], shop.id, true, admin, [{ ...admin, enabled: false }]).error)
const paused = moderateOwnedShop([{ ...shop, isOpen: true }], shop.id, true, admin, accounts)
assert.equal(paused.error, '')
assert.equal(paused.shops[0].adminSuspended, true)
assert.ok(placeOrderTransaction({ shops: paused.shops, orders: [] }, order, buyer).error)
const tampered = saveOwnedShop(paused.shops, { ...paused.shops[0], isOpen: false, adminSuspended: false }, session, accounts)
assert.equal(tampered.shops[0].adminSuspended, true)
assert.equal(tampered.shops[0].isOpen, true)
assert.equal(moderateOwnedShop(tampered.shops, shop.id, false, admin, accounts).shops[0].adminSuspended, false)
console.log('Administrator moderation and owner restriction checks passed')
