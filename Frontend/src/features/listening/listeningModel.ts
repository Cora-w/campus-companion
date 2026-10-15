export type ListeningTopic = 'roommate' | 'study' | 'lonely' | 'light' | 'general'
export type ListeningState = { topic: ListeningTopic; turn: number; offered: boolean; listeningOnly: boolean }
export type ListeningReply = { text: string; state: ListeningState; suggestions?: string[]; safety?: boolean }
export const initialListeningState: ListeningState = { topic: 'general', turn: 0, offered: false, listeningOnly: false }

// Local demonstration branches, not clinical screening or a language model.
export function listeningReply(input: string, previous: ListeningState): ListeningReply {
  const text = input.trim()
  const safetyText = text.replace(/(?:没有|并不|不是)(?:想死|想自杀|想伤害自己|正在自残|准备自杀)/g, '')
  if (/想自杀|想死|不想活了|准备自杀|想伤害自己|正在自残|有人要打我|威胁要打我/.test(safetyText)) {
    return { text: '这句话让我担心你现在的安全。如果危险就在眼前，请先联系身边可信任的人或拨打 110 / 120；不要只等线上回复。这里也有心理援助与真人支持入口。', state: { ...previous, offered: false }, safety: true }
  }
  if (/别问|不要问|不想说|不想解释/.test(text)) {
    return { text: '好，我先不问。你可以写下想说的话，也可以暂时停一会儿。', state: { ...previous, offered: false, listeningOnly: true } }
  }
  if (/换个话题|轻松聊|聊点轻松|聊.*游戏/.test(text)) {
    return { text: '好，换个轻松的话题。最近有没有一款游戏、一本书，或者一件你感兴趣的小事？', state: { topic: 'light', turn: 1, offered: false, listeningOnly: false } }
  }
  const requestedTopic = /室友|寝室|戴耳机/.test(text) ? 'roommate' : /作业|报告|考试|学习|成绩|交不完/.test(text) ? 'study' : /孤独|孤单|一个人|没人陪|没人理/.test(text) ? 'lonely' : null
  if (previous.offered && (!requestedTopic || requestedTopic === previous.topic)) {
    if (/不想|不要|先不|算了|只想|继续听|不需要/.test(text)) {
      return { text: '好，先不想办法。你想把刚才的事情说完，我听着；想停一会儿也可以。', state: { ...previous, offered: false, listeningOnly: true } }
    }
    if (/^(?:我)?(?:可以(?:的)?|愿意|试试|好(?:的|啊|呀)?|想看看|看看|怎么做|需要(?:建议)?|要)(?:[，。！!\s]|$)/.test(text)) {
      const suggestions = previous.topic === 'roommate'
        ? ['先缓一缓，等自己愿意时再处理。', '整理对方实际说了什么、自己怎样理解，看看有没有需要核实的地方。', '试着说：「刚才我声音大了，这点我道歉。但我当时确实想休息，下次能戴耳机吗？」可以按你的情况修改。']
        : previous.topic === 'study'
          ? ['先选一件最小的任务，只写下它的要求。', '整理你已经知道的内容，留下一个能继续写的开头。', '如果卡在具体知识点，准备一个明确的问题，问可信任的同学或老师。']
          : ['继续把今天的感受说出来。', '如果愿意，给一个信任的人写句简单的问候，由你决定是否发送。', '看看校园里有没有感兴趣的活动，只了解一下也可以。']
      return { text: '可以看看这些做法。它们只是选项，你可以修改，或者全部跳过。', suggestions, state: { ...previous, offered: false } }
    }
    return { text: '你可以继续说，不用急着决定要不要处理。', state: previous }
  }
  const topic = requestedTopic ?? previous.topic
  const turn = topic === previous.topic ? previous.turn + 1 : 1
  const state = { ...previous, topic, turn, offered: false }
  if (previous.listeningOnly) return { text: '你可以继续说，也可以先停下来。我不会替你决定怎么处理这件事。', state }
  if (topic === 'roommate') {
    if (turn === 1) return { text: '刚发生争执，确实容易越想越烦。你愿意说说是怎么吵起来的吗？', state }
    if (turn === 2) return { text: /睡|休息|视频|耳机/.test(text) ? '你想休息，提醒后却没有得到理解，听着挺伤人的。现在最让你介意的是休息被影响，还是他说话的态度？' : '听起来这次争执让你很不舒服。你现在最介意的是哪句话或哪件事？', state }
    return { text: '你可以先缓一缓，再决定要不要处理。如果愿意，要不要一起看看有哪些处理办法？', state: { ...state, offered: true } }
  }
  if (topic === 'study') {
    if (turn === 1) return { text: '事情堆在一起的时候，容易不知道从哪里开始。你现在最卡住的是哪一项？', state }
    return { text: '不用一次把所有任务都做完。要不要一起找一个能开始的小地方？', state: { ...state, offered: true } }
  }
  if (topic === 'lonely') {
    if (turn === 1) return { text: '一个人面对这些感受，可能挺难熬的。你愿意说说今天发生了什么吗？', state }
    return { text: '可以先在这里说说。如果你愿意，我们也可以看看有没有一种低压力的方式，和现实中信任的人建立联系。想看看吗？', state: { ...state, offered: true } }
  }
  if (topic === 'light') return { text: '可以从你喜欢的部分说起。最近有没有一个让你印象深刻的瞬间？', state }
  const replies = ['可以从一件小事开始，也可以只是把此刻的感受写下来，不用解释清楚。', '如果刚才的回应没有贴近你的意思，你可以纠正我。我们按你的节奏聊。', '不用马上找出答案，想继续说或者暂时停一下，都可以。']
  return { text: replies[(turn - 1) % replies.length], state }
}
