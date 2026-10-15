import assert from 'node:assert/strict'
import { test } from 'node:test'
import { personalLibrary } from '../src/features/student/libraryModel.ts'

const posts = [{ id:'post', title:'美食分享', category:'美食发现', author:'同学' }]
const places = [{ id:'shared', name:'旧窗口名称', kind:'好吃', category:'食堂', location:'一食堂' }, { id:'park', name:'校园公园', kind:'好玩', category:'散步', location:'校内' }]
const shops = [{ id:'shared', name:'面馆', category:'面食', address:'一食堂', products:[{ id:'noodle', name:'牛肉面', price:15 }] }]
const reviews = [{ id:'review', target:'noodle', author:'同学', text:'汤很好喝' }, { id:'orphan-review', target:'gone', author:'同学', text:'已删除店铺' }]
const pick = ids => personalLibrary(posts, places, shops, reviews, ids)
test('classifies the target type, keeps food posts under posts, and resolves duplicate shop/place ids once', () => {
  assert.deepEqual(pick(['post','shared','noodle','park','review']).map(e=>e.category), ['帖子','店铺','美食','地点','评价'])
  assert.equal(pick(['shared','shared'])[0].title,'面馆')
  assert.equal(pick(['shared','shared']).length,1)
})
test('opens liked food and helpful reviews in the correct product and shop', () => {
  assert.deepEqual(pick(['noodle'])[0].target,{kind:'shop',id:'shared',productId:'noodle'})
  assert.deepEqual(pick(['review'])[0].target,{kind:'shop',id:'shared',productId:'noodle',reviewId:'review'})
})
test('deduplicates records, excludes unavailable targets, and preserves recent browsing order', () => {
  assert.deepEqual(pick(['park','gone','post','park','orphan-review','noodle']).map(e=>e.id),['park','post','noodle'])
  assert.deepEqual(pick([]),[])
})
