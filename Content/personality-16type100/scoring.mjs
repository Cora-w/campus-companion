// Original preference heuristic, not official MBTI scoring. No IO or persistence.
export function validateBank(bank) {
  if (bank.bank_id !== 'campus-personality-16type-original-100' || bank.validation_status !== 'original_unvalidated' ||
      bank.item_count !== 100 || bank.questions?.length !== 100 || bank.axes?.length !== 4) throw new Error('Invalid type-preference bank')
  if (bank.axes.map(a => a.id).join(',') !== 'EI,SN,TF,JP') throw new Error('Invalid axes')
  const questions = new Map(bank.questions.map(q => [q.id, q]))
  if (questions.size !== 100 || new Set(bank.questions.map(q => q.text)).size !== 100) throw new Error('Duplicate questions')
  const listed = new Set()
  for (const axis of bank.axes) {
    if (axis.left + axis.right !== axis.id || axis.question_ids?.length !== 25) throw new Error('Invalid axis')
    let left = 0, right = 0
    for (const id of axis.question_ids) {
      const q = questions.get(id)
      if (!q || q.axis_id !== axis.id || ![axis.left, axis.right].includes(q.key) || q.required !== false ||
          typeof q.text !== 'string' || !q.text.trim() || listed.has(id)) throw new Error('Invalid question mapping')
      listed.add(id)
      if (q.key === axis.left) left++; else right++
    }
    if (left !== 13 || right !== 12 || axis.left_keyed_count !== left || axis.right_keyed_count !== right) throw new Error('Invalid key counts')
  }
  if (bank.administration_order?.length !== 100 || new Set(bank.administration_order).size !== 100 ||
      bank.administration_order.some(id => !listed.has(id))) throw new Error('Invalid presentation order')
  if (bank.response_options?.map(o => o.value).join(',') !== '1,2,3,4,5' || bank.scoring.official_mbti_scoring !== false ||
      bank.scoring.norms !== null || bank.scoring.probability !== false) throw new Error('Unsupported scoring metadata')
  return questions
}

export function scoreTypes(bank, answers) {
  const questions = validateBank(bank)
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new TypeError('Answers must be an object')
  const skips = new Set([null, 'not_applicable', 'prefer_not_to_answer'])
  for (const [id, value] of Object.entries(answers)) {
    if (!questions.has(id)) throw new RangeError(`Unknown question: ${id}`)
    if (!skips.has(value) && (!Number.isInteger(value) || value < 1 || value > 5)) throw new RangeError(`Invalid response: ${id}`)
  }
  const axes = bank.axes.map(axis => {
    let signedSum = 0, answered = 0
    const missingIds = []
    for (const id of axis.question_ids) {
      const value = Object.hasOwn(answers, id) ? answers[id] : null
      if (skips.has(value)) { missingIds.push(id); continue }
      answered++
      signedSum += (value - 3) * (questions.get(id).key === axis.left ? 1 : -1)
    }
    const complete = answered === 25
    const letter = !complete || signedSum === 0 ? null : signedSum > 0 ? axis.left : axis.right
    return {
      axis_id: axis.id, title: axis.title, left: axis.left, right: axis.right,
      left_label: axis.left_label, right_label: axis.right_label,
      answered, missing_ids: missingIds, signed_sum: complete ? signedSum : null,
      status: !complete ? 'incomplete' : letter === null ? 'tied' : 'leaning',
      letter, small_margin: complete && signedSum !== 0 && Math.abs(signedSum) <= 5,
    }
  })
  const complete = axes.every(a => a.status !== 'incomplete')
  const type = complete && axes.every(a => a.letter !== null) ? axes.map(a => a.letter).join('') : null
  let candidates = complete ? [''] : []
  if (complete) for (const axis of axes) candidates = candidates.flatMap(prefix => (axis.letter ? [axis.letter] : [axis.left, axis.right]).map(letter => prefix + letter))
  return {
    bank_id: bank.bank_id, bank_version: bank.version, complete,
    type, code_pattern: axes.map(a => a.letter ?? 'X').join(''),
    status: !complete ? 'incomplete' : type ? 'reference_type' : 'ambiguous',
    candidate_types: candidates, axes, notice: bank.result_notice,
  }
}
