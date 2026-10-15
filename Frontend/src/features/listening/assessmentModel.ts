export type AssessmentKind = 'mental' | 'personality'
export type Trait = 'extraversion' | 'agreeableness' | 'conscientiousness' | 'sensitivity' | 'imagination'
export type AssessmentItem = { text: string; trait?: Trait; reverse?: boolean }

export const mentalItems: AssessmentItem[] = [
  { text: '做事情时提不起兴趣或感受不到乐趣。' },
  { text: '感到情绪低落、沮丧或没有希望。' },
  { text: '难以入睡、睡不安稳，或睡得过多。' },
  { text: '感到疲惫或没有精力。' },
  { text: '食欲不振，或吃得过多。' },
  { text: '觉得自己很糟糕、很失败，或让自己和家人失望。' },
  { text: '难以集中注意力，例如阅读或看节目时。' },
  { text: '动作或说话慢到别人能注意到；或相反，烦躁不安，走动比平时多。' },
  { text: '觉得不如死去，或想到以某种方式伤害自己。' },
  { text: '感到紧张、焦虑或坐立不安。' },
  { text: '无法停止或控制自己的担忧。' },
  { text: '对不同的事情担忧过多。' },
  { text: '很难放松下来。' },
  { text: '因为不安而难以安坐。' },
  { text: '容易烦恼或变得急躁。' },
  { text: '感到害怕，好像有什么可怕的事情要发生。' },
]

// IPIP Big-Five 50-item form: 10 markers per factor, interleaved across factors.
// Emotional Stability is reversed here to display emotional sensitivity.
const personalityGroups: { trait: Trait; items: [string, boolean][] }[] = [
  { trait: 'extraversion', items: [
    ['在聚会中，我常常能活跃气氛。', false], ['我平时不太爱说话。', true],
    ['与他人相处时，我感到自在。', false], ['在人群中，我通常不引人注意。', true],
    ['我会主动开启话题。', false], ['我常常觉得没什么话可说。', true],
    ['聚会时，我会和不同的人交谈。', false], ['我不喜欢吸引别人的注意。', true],
    ['我不介意成为大家关注的焦点。', false], ['面对陌生人时，我比较安静。', true],
  ] },
  { trait: 'agreeableness', items: [
    ['我对别人的事情不太感兴趣。', true], ['我对他人感兴趣，愿意了解他们。', false],
    ['我有时会说侮辱别人的话。', true], ['我能体谅他人的感受。', false],
    ['我对别人的烦恼不太关心。', true], ['我的心肠比较软。', false],
    ['我对他人的遭遇很少在意。', true], ['我愿意为他人腾出时间。', false],
    ['我能感受到别人的情绪。', false], ['我能让别人觉得自在。', false],
  ] },
  { trait: 'conscientiousness', items: [
    ['我做事前通常准备充分。', false], ['我会随手乱放自己的东西。', true],
    ['我会注意细节。', false], ['我常把东西弄得杂乱。', true],
    ['我会及时完成日常事务。', false], ['我常忘记把物品放回原处。', true],
    ['我喜欢井然有序。', false], ['我有时会逃避自己应尽的责任。', true],
    ['我会按计划安排日常事务。', false], ['我对自己的工作要求严格。', false],
  ] },
  { trait: 'sensitivity', items: [
    ['我容易感到压力很大。', false], ['大多数时候，我都比较放松。', true],
    ['我经常为事情担忧。', false], ['我很少感到忧郁。', true],
    ['我很容易受到事情的干扰。', false], ['我容易感到烦乱或不安。', false],
    ['我的心情常常变化。', false], ['我的情绪经常起伏。', false],
    ['我容易感到恼火。', false], ['我常常感到忧郁。', false],
  ] },
  { trait: 'imagination', items: [
    ['我的词汇量比较丰富。', false], ['我觉得抽象的想法很难理解。', true],
    ['我有丰富的想象力。', false], ['我对抽象的想法不太感兴趣。', true],
    ['我常有很好的点子。', false], ['我觉得自己的想象力不太丰富。', true],
    ['我理解事情比较快。', false], ['我会使用较难的词语。', false],
    ['我会花时间思考事情。', false], ['我的脑海里常有很多想法。', false],
  ] },
]
export const personalityItems: AssessmentItem[] = Array.from({ length: 10 }, (_, i) => personalityGroups.map(group => ({ text: group.items[i][0], trait: group.trait, reverse: group.items[i][1] }))).flat()

export const traits: { key: Trait; name: string; low: string; high: string; descriptions: [string, string, string] }[] = [
  { key: 'extraversion', name: '外向性', low: '偏好安静', high: '偏好互动', descriptions: ['独处或小范围交流可能更让你自在，可以按自己的节奏社交。', '你在独处和互动之间比较灵活，可以留意不同场景下的需要。', '你可能更享受交流与参与，也可以为自己保留休息时间。'] },
  { key: 'agreeableness', name: '宜人性', low: '重视立场', high: '重视体谅', descriptions: ['你可能更直接、重视自己的判断，沟通时也可以主动确认对方的感受。', '你可能会兼顾自己的立场和他人的需要。', '你可能比较体贴、重视合作，同时也可以练习表达自己的边界。'] },
  { key: 'conscientiousness', name: '尽责性', low: '偏好灵活', high: '偏好计划', descriptions: ['你可能喜欢灵活安排，用小清单帮助自己处理重要任务会更轻松。', '你可能在计划和灵活调整之间寻找平衡。', '你可能重视条理和执行，也可以允许计划留有余地。'] },
  { key: 'sensitivity', name: '情绪敏感性', low: '较少波动', high: '更易波动', descriptions: ['你的回答偏向较少情绪波动；需要支持时仍然可以主动表达。', '你对情绪变化的体验处于中间位置，环境和近期经历也会产生影响。', '你可能更容易感受到情绪变化，可以留意休息、压力和自己的需要。'] },
  { key: 'imagination', name: '想象与求知', low: '偏好具体', high: '偏好抽象', descriptions: ['你可能更喜欢具体、实际的事物，动手探索也能带来新体验。', '你可能同时享受具体经验和新的想法。', '你可能喜欢想象和抽象思考，可以通过写作或创作探索兴趣。'] },
]

export function assessmentItems(kind: AssessmentKind) { return kind === 'mental' ? mentalItems : personalityItems }
function requireAnswers(answers: readonly (number | null)[], count: number, min: number, max: number): asserts answers is readonly number[] {
  if (answers.length !== count || Array.from(answers).some(n => n === null || !Number.isInteger(n) || n < min || n > max)) throw new Error('请完成全部题目后查看结果。')
}
export function scoreMental(answers: readonly (number | null)[]) {
  requireAnswers(answers, 16, 0, 3)
  const depression = answers.slice(0, 9).reduce((sum, n) => sum + n, 0)
  const anxiety = answers.slice(9).reduce((sum, n) => sum + n, 0)
  const depressionLevel = depression < 5 ? 0 : depression < 10 ? 1 : depression < 15 ? 2 : depression < 20 ? 3 : 4
  const anxietyLevel = anxiety < 5 ? 0 : anxiety < 10 ? 1 : anxiety < 15 ? 2 : 3
  return { depression, anxiety, depressionLevel, anxietyLevel, needsSupport: answers[8] > 0,
    depressionLabel: ['很少或没有', '轻度', '中度', '中重度', '重度'][depressionLevel],
    anxietyLabel: ['很少或没有', '轻度', '中度', '重度'][anxietyLevel] }
}
export function scorePersonality(answers: readonly (number | null)[]) {
  requireAnswers(answers, 50, 1, 5)
  return traits.map(trait => {
    const values = personalityItems.flatMap((item, i) => item.trait === trait.key ? [item.reverse ? 6 - answers[i] : answers[i]] : [])
    const average = values.reduce((sum, n) => sum + n, 0) / values.length
    return { ...trait, average, position: (average - 1) * 25, description: trait.descriptions[average < 2.5 ? 0 : average > 3.5 ? 2 : 1] }
  })
}
