import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conversationTime } from '../src/features/messages/conversationTime.ts'

test('timestamps stay compact and use the Shanghai calendar day', () => {
  const now = new Date('2026-10-09T16:30:00Z')
  assert.equal(conversationTime('2026-10-09T16:15:36.808869413Z', '', now), '00:15')
  assert.equal(conversationTime('2026-10-09T15:59:00Z', '', now), '昨天')
  assert.equal(conversationTime('2026-10-08T02:53:36.808869413Z', '', now), '10-08')
  assert.equal(conversationTime('2025-10-04T22:30:35.571193355Z', '', now), '2025-10-05')
  assert.equal(conversationTime('9:05'), '09:05')
  assert.equal(conversationTime('样例'), '样例')
  assert.equal(conversationTime('2026-99-99T00:00:00Z', '刚刚'), '刚刚')
  assert.equal(conversationTime(undefined, '样例'), '样例')
})
