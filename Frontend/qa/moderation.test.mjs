import { test } from 'node:test'
import assert from 'node:assert/strict'
import { submitPostReport, reviewPost, priorityReportCount } from '../src/features/moderation/moderationModel.ts'
const schoolId = 'school-1'
const post = { id: 'p1', author: '学生', category: '校园日常', title: '公开帖', text: '正文', location: '', time: '', likes: 0, comments: [], images: [], ownerId: 'owner' }
const initial = () => ({ posts: [{ schoolId, post }, { schoolId, post: { ...post, id: 'private', visibility: 'self' } }], reports: [], decisions: [] })
const actor = (id, role = 'student', school = schoolId) => ({ id, role, schoolId: school, enabled: true })
const report = (id, postId = 'p1') => ({ id: 'r-' + id, postId, schoolId, reporterId: id, reason: '泄露个人信息', time: 'now', resolved: false })
const decision = (action = '删除', postId = 'p1') => ({ id: 'd1', postId, schoolId, actorId: 'admin', action, reason: '核实违规内容', time: 'now' })
test('distinct reports reach priority threshold without deleting the post; duplicates are rejected', () => {
  let state = initial()
  for (let i = 1; i <= priorityReportCount; i++) { const result = submitPostReport(state, actor('s' + i), report('s' + i)); assert.equal(result.error, ''); state = result.state }
  assert.equal(state.reports.length, priorityReportCount)
  assert.equal(state.decisions.length, 0)
  assert.equal(state.posts.length, 2)
  const duplicate = submitPostReport(state, actor('s1'), report('s1'))
  assert.match(duplicate.error, /已经举报/)
  assert.equal(duplicate.state, state)
})
test('private posts, own posts, other schools, disabled and nonstudent reporters are denied', () => {
  const state = initial()
  const attempts = [[actor('owner'), report('owner')], [actor('s1'), report('s1', 'private')], [actor('s1', 'student', 'other'), report('s1')], [{ ...actor('s1'), enabled: false }, report('s1')], [actor('admin', 'admin'), report('admin')]]
  for (const [user, record] of attempts) { const result = submitPostReport(state, user, record); assert.ok(result.error); assert.equal(result.state, state) }
})
test('only same-school enabled admins can review public posts, with a nonempty reason', () => {
  const state = initial()
  for (const user of [actor('admin'), actor('admin', 'admin', 'other'), { ...actor('admin', 'admin'), enabled: false }]) assert.ok(reviewPost(state, user, decision()).error)
  assert.ok(reviewPost(state, actor('admin', 'admin'), { ...decision(), reason: ' ' }).error)
  assert.ok(reviewPost(state, actor('admin', 'admin'), decision('删除', 'private')).error)
})
test('delete closes reports, retains review evidence, rejects later reports and repeated deletes', () => {
  let state = submitPostReport(initial(), actor('s1'), report('s1')).state
  const result = reviewPost(state, actor('admin', 'admin'), decision())
  assert.equal(result.error, ''); state = result.state
  assert.equal(state.reports[0].resolved, true)
  assert.equal(state.decisions[0].reason, '核实违规内容')
  assert.equal(state.posts[0].post.text, '正文')
  assert.match(submitPostReport(state, actor('s2'), report('s2')).error, /已被删除/)
  assert.match(reviewPost(state, actor('admin', 'admin'), decision()).error, /已被删除/)
})
test('retain resolves existing reports, a new reporter can open a later review', () => {
  let state = submitPostReport(initial(), actor('s1'), report('s1')).state
  state = reviewPost(state, actor('admin', 'admin'), decision('保留')).state
  assert.equal(state.reports[0].resolved, true)
  assert.ok(submitPostReport(state, actor('s1'), report('s1')).error)
  const result = submitPostReport(state, actor('s2'), report('s2'))
  assert.equal(result.error, '')
  assert.equal(result.state.reports.filter(r => !r.resolved).length, 1)
})
