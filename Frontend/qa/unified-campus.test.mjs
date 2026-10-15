import { test } from 'node:test'
import assert from 'node:assert/strict'
import { staffEntries, canOpenStaffTarget } from '../src/navigation/workspaceNavigation.ts'
import { campusServices } from '../src/navigation/campusServices.ts'
import { placeOrderTransaction, changeOrderTransaction } from '../src/features/commerce/orderTransactions.ts'
const shop = { id: 'shop', name: '小店', products: [{ id: 'tea', name: '茶', price: 500, stock: 10 }] }
const order = (id) => ({ id: 'order-' + id, studentId: id, shopId: shop.id, shop: shop.name, items: [{ productId: 'tea', name: '茶', count: 1, price: 500 }], total: 500, fee: 0, mode: '到店自提', address: '校园', recipient: '', phone: '', status: '待接单' })
test('listening is student-only and staff replacements open authorized work pages', () => {
  assert.equal(campusServices('student').find(entry => entry.hub === 'listen')?.name, '倾诉空间')
  for (const role of ['teacher', 'admin', 'merchant']) assert.equal(campusServices(role).some(entry => entry.hub === 'listen' || entry.words.includes('倾诉')), false)
  for (const [role, page] of [['teacher', 'schedule'], ['admin', 'feedback']]) {
    const target = campusServices(role).find(entry => entry.target)?.target
    assert.deepEqual(target, { role, page })
    assert.equal(canOpenStaffTarget(role, target), true)
    assert.equal(canOpenStaffTarget(role === 'teacher' ? 'admin' : 'teacher', target), false)
  }
})
test('professional entry points are exclusive to the authenticated role', () => {
  assert.deepEqual(staffEntries('student'), [])
  assert.deepEqual(staffEntries('merchant'), [])
  for (const role of ['teacher', 'admin']) for (const entry of staffEntries(role)) {
    assert.equal(canOpenStaffTarget(role, entry.target), true)
    for (const other of ['student', 'merchant', role === 'teacher' ? 'admin' : 'teacher', undefined]) assert.equal(canOpenStaffTarget(other, entry.target), false)
  }
  assert.equal(canOpenStaffTarget('teacher', { role: 'teacher', page: 'accounts' }), false)
})
test('all three identities can purchase and cancel their own order but cannot fulfill or cancel peer orders', () => {
  for (const role of ['student', 'teacher', 'admin']) {
    const actor = { id: role, role }, ownOrder = order(role)
    const placed = placeOrderTransaction({ shops: [shop], orders: [] }, ownOrder, actor)
    assert.equal(placed.error, '')
    assert.equal(changeOrderTransaction(placed.state, ownOrder.id, '已取消', actor).error, '')
    assert.ok(changeOrderTransaction(placed.state, ownOrder.id, '备货中', actor).error)
    assert.ok(changeOrderTransaction(placed.state, ownOrder.id, '已取消', { ...actor, id: 'peer' }).error)
    assert.ok(placeOrderTransaction({ shops: [shop], orders: [] }, ownOrder, { ...actor, id: 'peer' }).error)
  }
  assert.ok(placeOrderTransaction({ shops: [shop], orders: [] }, order('merchant'), { id: 'merchant', role: 'merchant' }).error)
})
