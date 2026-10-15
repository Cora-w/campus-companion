import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateBank, scorePersonality } from './scoring.mjs'
const bank = JSON.parse(await readFile(new URL('./question-bank.json', import.meta.url), 'utf8'))
const answers = fn => Object.fromEntries(bank.questions.map(q => [q.id, fn(q)]))

test('bank has exactly 100 unique bilingual items and the five official key counts', () => {
  assert.equal(validateBank(bank).size, 100)
})
test('trait-aligned responses reach maximum; opposite responses reach minimum', () => {
  const high = scorePersonality(bank, answers(q => q.key === 'positive' ? 5 : 1))
  const low = scorePersonality(bank, answers(q => q.key === 'positive' ? 1 : 5))
  for (const d of high.domains) { assert.equal(d.raw_sum, 100); assert.equal(d.mean, 5) }
  for (const d of low.domains) { assert.equal(d.raw_sum, 20); assert.equal(d.mean, 1) }
  assert.equal(high.complete, true)
})
test('neutral responses yield raw 60 and mean 3 in every domain', () => {
  for (const d of scorePersonality(bank, answers(() => 3)).domains) {
    assert.equal(d.raw_sum, 60); assert.equal(d.mean, 3)
  }
})
test('all-fives respects unequal key counts and emotional stability direction', () => {
  assert.deepEqual(scorePersonality(bank, answers(() => 5)).domains.map(d => d.raw_sum), [60, 76, 64, 40, 72])
})
test('missing and explicit skips suppress only the affected domain without imputation', () => {
  for (const skip of [null, 'not_applicable', 'prefer_not_to_answer']) {
    const input = answers(() => 3)
    input['IPIP100-001'] = skip
    const result = scorePersonality(bank, input)
    assert.equal(result.complete, false)
    assert.equal(result.domains[0].raw_sum, null)
    assert.equal(result.domains[0].mean, null)
    assert.equal(result.domains[0].answered, 19)
    assert.equal(result.domains[1].raw_sum, 60)
  }
  for (const d of scorePersonality(bank, {}).domains) {
    assert.equal(d.answered, 0); assert.equal(d.raw_sum, null); assert.equal(d.mean, null)
  }
})
test('out-of-range, fractional, boolean, string and unknown answers are rejected', () => {
  for (const value of [0, 6, 2.5, true, '3', '', undefined, NaN, Infinity]) {
    assert.throws(() => scorePersonality(bank, { 'IPIP100-001': value }))
  }
  assert.throws(() => scorePersonality(bank, { unknown: 3 }))
  assert.throws(() => scorePersonality(bank, []))
  assert.throws(() => scorePersonality(bank, null))
})
test('inherited properties never count as answers', () => {
  assert.equal(scorePersonality(bank, Object.create({ 'IPIP100-001': 5 })).domains[0].answered, 0)
})
test('results have no total score, diagnostic labels or fabricated percentiles', () => {
  const input = answers(() => 3)
  const before = JSON.stringify(input)
  const result = scorePersonality(bank, input)
  assert.deepEqual(Object.keys(result).sort(), ['bank_id', 'bank_version', 'complete', 'domains', 'translation_status'])
  assert.equal(JSON.stringify(input), before)
})
test('wrong keys, duplicated questions and invalid presentation order are rejected', () => {
  for (const mutate of [
    b => { b.questions[0].key = 'reverse' },
    b => { b.questions[1].id = b.questions[0].id },
    b => { b.administration_order[0] = 'unknown' },
    b => { b.domains[1].question_ids[0] = 'IPIP100-001' },
  ]) {
    const broken = structuredClone(bank); mutate(broken)
    assert.throws(() => validateBank(broken))
  }
})
test('readable edition contains the same 100 translations and English originals', async () => {
  const md = await readFile(new URL('./question-bank.md', import.meta.url), 'utf8')
  assert.equal(md.split('\n').filter(line => line.startsWith('- **IPIP100-')).length, 100)
  for (const q of bank.questions) {
    assert.ok(md.includes(`- **${q.id}** ${q.text}`))
    assert.ok(md.includes(`  - 英文：${q.source_text_en}`))
  }
})
