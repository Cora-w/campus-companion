import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Semantic checks supplement question-bank.schema.json; no network or database access.
export function validateBank(bank) {
  assert.equal(bank.schema_version, '1.0.0')
  assert.equal(bank.bank_id, 'college-daily-self-reflection-zh-cn')
  assert.match(bank.version, /^\d{4}\.\d{2}\.\d{2}$/)
  assert.equal(bank.language, 'zh-CN')
  assert.equal(bank.status, 'original_draft_unvalidated')
  assert.equal(bank.item_count, 500)
  assert.equal(bank.questions.length, bank.item_count)
  assert.equal(bank.theme_count, 20)
  assert.equal(bank.themes.length, bank.theme_count)
  assert.equal(bank.recall_period.days, 14)
  assert.equal(bank.administration.default_form, 'one_theme')
  assert.equal(bank.administration.items_per_theme, 25)
  assert.equal(bank.administration.allow_skip, true)
  assert.equal(bank.administration.allow_exit, true)
  assert.equal(bank.administration.require_all_500, false)
  assert.equal(bank.administration.random_selection_is_validated, false)
  assert.equal(bank.interpretation.method, 'response_distribution_only')
  assert.equal(bank.interpretation.generate_total_score, false)
  assert.equal(bank.interpretation.diagnostic_thresholds, null)
  assert.equal(bank.interpretation.norms, null)
  assert.equal(bank.interpretation.reverse_scoring, false)
  assert.deepEqual(bank.response_options.map(o => o.code), ['never', 'rarely', 'sometimes', 'often', 'almost_always'])
  assert.deepEqual(bank.response_options.map(o => o.order), [0, 1, 2, 3, 4])
  assert.deepEqual(bank.skip_options.map(o => o.code), ['not_applicable', 'prefer_not_to_answer'])
  for (const option of [...bank.response_options, ...bank.skip_options]) {
    assert.ok(typeof option.label === 'string' && option.label.trim())
  }
  for (const field of ['title', 'purpose', 'instructions', 'support_text']) {
    assert.ok(typeof bank[field] === 'string' && bank[field].trim())
  }
  assert.equal(bank.provenance.kind, 'original_ai_assisted')
  assert.equal(bank.provenance.item_level_translation_mapping, null)
  const sourceIds = new Set(bank.sources.map(s => s.id))
  assert.equal(sourceIds.size, bank.sources.length, 'Duplicate source IDs')
  assert.ok(bank.provenance.reference_ids.length > 0)
  for (const id of bank.provenance.reference_ids) assert.ok(sourceIds.has(id), `Missing source ${id}`)
  for (const source of bank.sources) {
    const url = new URL(source.url)
    assert.equal(url.protocol, 'https:')
    assert.ok(['ipip.ori.org', 'www.who.int'].includes(url.hostname))
    assert.ok(source.title && source.publisher && source.role && source.reuse_notes)
    assert.match(source.accessed_on, /^\d{4}-\d{2}-\d{2}$/)
  }
  const themes = new Map(bank.themes.map(t => [t.id, t]))
  assert.equal(themes.size, 20, 'Duplicate theme IDs')
  const questions = new Map(bank.questions.map(q => [q.id, q]))
  assert.equal(questions.size, 500, 'Duplicate question IDs')
  const texts = new Set()
  for (const [index, question] of bank.questions.entries()) {
    assert.equal(question.id, `CDSR-${String(index + 1).padStart(4, '0')}`)
    assert.ok(themes.has(question.theme_id), `Missing theme for ${question.id}`)
    assert.ok(typeof question.text === 'string')
    assert.equal(question.text, question.text.trim())
    assert.ok(question.text.length >= 8 && question.text.length <= 80)
    assert.ok(!/[\u0000-\u001f\u007f]/u.test(question.text))
    const normalized = question.text.normalize('NFKC').replace(/[\s\p{P}]/gu, '')
    assert.ok(!texts.has(normalized), `Duplicate wording: ${question.id}`)
    texts.add(normalized)
    assert.ok(['resource', 'challenge'].includes(question.indicator))
    assert.equal(question.response_type, 'single_choice_frequency')
    assert.equal(question.required, false)
    assert.equal(question.provenance_id, bank.provenance.id)
  }
  const listedIds = []
  for (const theme of bank.themes) {
    assert.equal(theme.item_count, 25)
    assert.equal(theme.question_ids.length, 25)
    assert.equal(new Set(theme.question_ids).size, 25)
    const counts = { resource: 0, challenge: 0 }
    theme.question_ids.forEach((id, index) => {
      const question = questions.get(id)
      assert.ok(question, `Unknown question ${id}`)
      assert.equal(question.theme_id, theme.id)
      assert.equal(question.order_in_theme, index + 1)
      counts[question.indicator]++
    })
    assert.deepEqual(counts, { resource: 20, challenge: 5 })
    listedIds.push(...theme.question_ids)
  }
  assert.equal(listedIds.length, 500)
  assert.equal(new Set(listedIds).size, 500, 'A question belongs to multiple forms')
  return { questions: questions.size, themes: themes.size, resources: 400, challenges: 100 }
}

export function validateReadable(bank, markdown) {
  const lines = markdown.split(/\r?\n/).filter(line => line.startsWith('- **CDSR-'))
  assert.equal(lines.length, bank.questions.length, 'Readable edition has missing or extra items')
  assert.deepEqual(lines, bank.questions.map(q => `- **${q.id}** ${q.text}`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bank = JSON.parse(await readFile(new URL('./question-bank.json', import.meta.url), 'utf8'))
  const markdown = await readFile(new URL('./question-bank.md', import.meta.url), 'utf8')
  const result = validateBank(bank)
  validateReadable(bank, markdown)
  console.log(JSON.stringify({ status: 'passed', ...result, readable_edition: 'matches' }, null, 2))
}
