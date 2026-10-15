import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateBank, validateReadable } from './validate.mjs'

const original = JSON.parse(await readFile(new URL('./question-bank.json', import.meta.url), 'utf8'))
const markdown = await readFile(new URL('./question-bank.md', import.meta.url), 'utf8')

test('complete bank has 500 unique items, 20 themes and a matching reading edition', () => {
  assert.deepEqual(validateBank(original), { questions: 500, themes: 20, resources: 400, challenges: 100 })
  validateReadable(original, markdown)
})
const mutations = {
  'missing item': bank => bank.questions.pop(),
  'duplicate ID': bank => { bank.questions[1].id = bank.questions[0].id },
  'duplicate wording': bank => { bank.questions[1].text = bank.questions[0].text },
  'question assigned to wrong theme': bank => { bank.themes[1].question_ids[0] = bank.questions[0].id },
  'broken provenance link': bank => { bank.questions[0].provenance_id = 'unknown' },
  'unknown reference': bank => { bank.provenance.reference_ids.push('invented') },
  'missing opt-out': bank => { bank.skip_options.pop() },
  'required question': bank => { bank.questions[0].required = true },
  'mandatory 500-item form': bank => { bank.administration.require_all_500 = true },
  'unsupported total score': bank => { bank.interpretation.generate_total_score = true },
  'unsupported diagnostic threshold': bank => { bank.interpretation.diagnostic_thresholds = [50] },
  'duplicate frequency option': bank => { bank.response_options[1].code = 'never' },
}
for (const [label, mutate] of Object.entries(mutations)) {
  test(`rejects ${label}`, () => {
    const bank = structuredClone(original)
    mutate(bank)
    assert.throws(() => validateBank(bank))
  })
}
test('reading edition cannot silently disagree with JSON', () => {
  assert.throws(() => validateReadable(original, markdown.replace(original.questions[0].text, '不一致的题干。')))
})
