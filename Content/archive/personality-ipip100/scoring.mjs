// Uses only caller-supplied data; no storage, network, identities or notifications.
export function validateBank(bank) {
  if (bank.bank_id !== 'ipip-big-five-100-zh-draft' || bank.item_count !== 100 ||
      bank.questions?.length !== 100 || bank.domains?.length !== 5) throw new Error('Invalid IPIP-100 bank')
  const expected = new Map([
    ['extraversion', [10, 10]], ['agreeableness', [14, 6]],
    ['conscientiousness', [11, 9]], ['emotional-stability', [5, 15]],
    ['intellect-imagination', [13, 7]],
  ])
  const questions = new Map(bank.questions.map(q => [q.id, q]))
  if (questions.size !== 100) throw new Error('Duplicate question IDs')
  const chinese = new Set(), english = new Set(), listed = new Set()
  for (const [index, q] of bank.questions.entries()) {
    if (q.id !== `IPIP100-${String(index + 1).padStart(3, '0')}` || !expected.has(q.domain_id) ||
        !['positive', 'reverse'].includes(q.key) || q.required !== false ||
        typeof q.text !== 'string' || !q.text.trim() || typeof q.source_text_en !== 'string' || !q.source_text_en.trim() ||
        q.source_url !== 'https://ipip.ori.org/newBigFive5broadKey.htm') throw new Error(`Invalid item ${q.id}`)
    chinese.add(q.text.trim()); english.add(q.source_text_en.trim())
  }
  if (chinese.size !== 100 || english.size !== 100) throw new Error('Duplicate item wording')
  const seenDomains = new Set()
  for (const domain of bank.domains) {
    if (!expected.has(domain.id) || seenDomains.has(domain.id) || domain.question_ids?.length !== 20) throw new Error('Invalid domain')
    seenDomains.add(domain.id)
    let positive = 0, reverse = 0
    domain.question_ids.forEach((id, index) => {
      const q = questions.get(id)
      if (!q || q.domain_id !== domain.id || q.source_section_index !== index + 1 || listed.has(id)) throw new Error('Invalid domain membership')
      listed.add(id)
      if (q.key === 'positive') positive++; else reverse++
    })
    const [p, r] = expected.get(domain.id)
    if (positive !== p || reverse !== r || domain.positive_count !== p || domain.reverse_count !== r) throw new Error('Incorrect key counts')
  }
  if (listed.size !== 100 || bank.administration_order?.length !== 100 ||
      new Set(bank.administration_order).size !== 100 || bank.administration_order.some(id => !listed.has(id))) throw new Error('Invalid presentation order')
  if (bank.response_options?.map(o => o.value).join(',') !== '1,2,3,4,5' ||
      bank.skip_options?.map(o => o.code).join(',') !== 'not_applicable,prefer_not_to_answer' ||
      bank.translation_status !== 'unvalidated_ai_assisted_draft' || bank.scoring.total_score !== null ||
      bank.scoring.norms !== null || bank.scoring.clinical_cutoffs !== null || bank.scoring.type_classification !== null) throw new Error('Unsupported interpretation configuration')
  return questions
}

// Answers is an object keyed by question ID. Missing/null/explicit skip values remain missing.
export function scorePersonality(bank, answers) {
  const questions = validateBank(bank)
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new TypeError('Answers must be an object')
  const skips = new Set([null, 'not_applicable', 'prefer_not_to_answer'])
  for (const [id, value] of Object.entries(answers)) {
    if (!questions.has(id)) throw new RangeError(`Unknown question: ${id}`)
    if (!skips.has(value) && (!Number.isInteger(value) || value < 1 || value > 5)) throw new RangeError(`Invalid answer: ${id}`)
  }
  const domains = bank.domains.map(domain => {
    let answered = 0, sum = 0
    const missingIds = []
    for (const id of domain.question_ids) {
      const value = Object.hasOwn(answers, id) ? answers[id] : null
      if (skips.has(value)) { missingIds.push(id); continue }
      answered++
      sum += questions.get(id).key === 'reverse' ? 6 - value : value
    }
    const complete = answered === 20
    return {
      domain_id: domain.id, title: domain.title, answered, required_for_score: 20,
      missing_ids: missingIds, status: complete ? 'complete' : 'incomplete',
      raw_sum: complete ? sum : null, mean: complete ? sum / 20 : null,
    }
  })
  return {
    bank_id: bank.bank_id, bank_version: bank.version,
    translation_status: bank.translation_status,
    complete: domains.every(d => d.status === 'complete'), domains,
  }
}
