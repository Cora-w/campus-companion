import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { scoreTypes, validateBank } from './scoring.mjs'
const bank = JSON.parse(await readFile(new URL('./question-bank.json', import.meta.url), 'utf8'))
const profiles = JSON.parse(await readFile(new URL('./type-profiles.json', import.meta.url), 'utf8')).profiles
const allTypes = ['E','I'].flatMap(a => ['S','N'].flatMap(b => ['T','F'].flatMap(c => ['J','P'].map(d => a+b+c+d))))
function forType(type) {
  return Object.fromEntries(bank.questions.map(q => [q.id, q.key === type[bank.axes.findIndex(a => a.id === q.axis_id)] ? 5 : 1]))
}
test('100 unique questions, 4 axes, and all 16 original profiles', () => {
  assert.equal(validateBank(bank).size, 100)
  assert.deepEqual(Object.keys(profiles).sort(), [...allTypes].sort())
  for (const type of allTypes) {
    assert.equal(profiles[type].code, type)
    assert.ok(profiles[type].title && profiles[type].summary && profiles[type].reflection)
  }
})
for (const type of allTypes) test(`complete aligned answers yield ${type}`, () => {
  const result = scoreTypes(bank, forType(type))
  assert.equal(result.type, type)
  assert.equal(result.status, 'reference_type')
  assert.deepEqual(result.candidate_types, [type])
  for (const axis of result.axes) assert.equal(Math.abs(axis.signed_sum), 50)
})
test('neutral answers never force a type or a tie-break letter', () => {
  const result = scoreTypes(bank, Object.fromEntries(bank.questions.map(q => [q.id, 3])))
  assert.equal(result.type, null)
  assert.equal(result.status, 'ambiguous')
  assert.equal(result.code_pattern, 'XXXX')
  assert.deepEqual([...result.candidate_types].sort(), [...allTypes].sort())
  assert.ok(result.axes.every(a => a.signed_sum === 0))
})
test('one tied axis yields only compatible alternatives', () => {
  const answers = forType('INFP')
  for (const id of bank.axes[0].question_ids) answers[id] = 3
  const result = scoreTypes(bank, answers)
  assert.equal(result.type, null)
  assert.equal(result.code_pattern, 'XNFP')
  assert.deepEqual(result.candidate_types, ['ENFP', 'INFP'])
})
test('missing and skipped answers never become neutral scores or a full type', () => {
  for (const value of [null, 'not_applicable', 'prefer_not_to_answer']) {
    const answers = forType('INFP'); answers['TYPE100-001'] = value
    const result = scoreTypes(bank, answers)
    assert.equal(result.status, 'incomplete'); assert.equal(result.type, null)
    assert.equal(result.axes[0].signed_sum, null); assert.equal(result.axes[0].answered, 24)
    assert.deepEqual(result.candidate_types, [])
    assert.equal(result.axes[1].letter, 'N')
  }
  const empty = scoreTypes(bank, {})
  assert.equal(empty.type, null)
  assert.ok(empty.axes.every(a => a.status === 'incomplete' && a.signed_sum === null))
})
test('small nonzero margins are disclosed without a probability', () => {
  const answers = Object.fromEntries(bank.questions.map(q => [q.id, 3]))
  for (const axis of bank.axes) answers[axis.question_ids[0]] = 4
  const result = scoreTypes(bank, answers)
  assert.equal(result.type, 'ESTJ')
  assert.ok(result.axes.every(a => a.small_margin && a.signed_sum === 1))
  assert.equal(Object.hasOwn(result, 'probability'), false)
})
test('reverse-key direction works on both sides of the neutral option', () => {
  for (const [answer, expected] of [[5, -2], [1, 2]]) {
    const input = Object.fromEntries(bank.questions.map(q => [q.id, 3]))
    input['TYPE100-002'] = answer
    assert.equal(scoreTypes(bank, input).axes[0].signed_sum, expected)
  }
})
test('invalid and old-bank IDs and non-integer responses are rejected', () => {
  for (const value of [0, 6, 2.5, true, '5', undefined, NaN, Infinity]) assert.throws(() => scoreTypes(bank, {'TYPE100-001':value}))
  assert.throws(() => scoreTypes(bank, {'IPIP100-001':5}))
  assert.throws(() => scoreTypes(bank, []))
  assert.throws(() => scoreTypes(bank, null))
})
test('inherited fields do not count; function does not mutate answers', () => {
  assert.equal(scoreTypes(bank, Object.create({'TYPE100-001':5})).axes[0].answered, 0)
  const answers = forType('ENFJ'); const before = JSON.stringify(answers)
  scoreTypes(bank, answers); assert.equal(JSON.stringify(answers), before)
})
test('malformed banks and incompatible interpretation settings are rejected', () => {
  for (const mutate of [
    b=>{b.questions[0].key='N'}, b=>{b.questions[1].id=b.questions[0].id},
    b=>{b.administration_order[0]='missing'}, b=>{b.scoring.official_mbti_scoring=true},
  ]) { const broken=structuredClone(bank); mutate(broken); assert.throws(()=>validateBank(broken)) }
})
test('human-readable question list agrees with JSON', async () => {
  const md = await readFile(new URL('./question-bank.md', import.meta.url), 'utf8')
  const lines = md.split('\n').filter(line=>line.startsWith('- **TYPE100-'))
  assert.deepEqual(lines, bank.questions.map(q=>`- **${q.id}** ${q.text}`))
})
test('standalone page matches current sources and has no external scripts', async () => {
  const html = await readFile(new URL('./preview.html', import.meta.url), 'utf8')
  const source = await readFile(new URL('./scoring.mjs', import.meta.url), 'utf8')
  assert.ok(html.includes(source.replaceAll('export function ', 'function ')))
  assert.ok(html.includes(JSON.stringify(bank).replaceAll('<', String.fromCharCode(92)+'u003c')))
  assert.ok(!/<script[^>]*src=/i.test(html))
  assert.ok(!html.includes('/*__BANK__*/'))
})
