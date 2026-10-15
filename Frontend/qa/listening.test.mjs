import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialListeningState, listeningReply } from '../src/features/listening/listeningModel.ts'

function offer() {
  let state = initialListeningState
  for (const text of ['我跟室友吵架了', '我想睡觉，他一直放视频', '我不知道怎么开口']) state = listeningReply(text, state).state
  return state
}
test('suggestions require explicit consent, not an unrelated positive word', () => {
  const state = offer()
  assert.equal(state.offered, true)
  assert.equal(listeningReply('今天感觉不好', state).suggestions, undefined)
  assert.equal(listeningReply('你好', state).suggestions, undefined)
  assert.equal(listeningReply('我想看看', state).suggestions?.length, 3)
})
test('refusal persists until the student chooses another direction', () => {
  let result = listeningReply('算了，先不想办法', offer())
  assert.equal(result.state.listeningOnly, true)
  result = listeningReply('室友还是让我很烦', result.state)
  assert.equal(result.state.offered, false)
  assert.equal(result.suggestions, undefined)
  result = listeningReply('换个话题，聊游戏', result.state)
  assert.equal(result.state.topic, 'light')
  assert.equal(result.state.listeningOnly, false)
})
test('safety examples offer support while explicit negation is not labelled as a danger signal', () => {
  assert.equal(listeningReply('我不想活了', initialListeningState).safety, true)
  assert.equal(listeningReply('我没有想死，只是很烦', initialListeningState).safety, undefined)
  assert.equal(listeningReply('我不想解释', initialListeningState).state.listeningOnly, true)
})
test('a new scene resets turn progression and does not inherit consent', () => {
  const result = listeningReply('考试让我很烦', offer())
  assert.equal(result.suggestions, undefined)
  assert.equal(result.state.topic, 'study')
  assert.equal(result.state.offered, false)
  const fresh = listeningReply('考试让我很烦', initialListeningState)
  assert.equal(fresh.state.topic, 'study')
  assert.equal(fresh.state.offered, false)
})
