const parts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]))

export function conversationTime(value: string | undefined, fallback = '', now = new Date()): string {
  if (!value) return fallback
  if (/^\d{1,2}:\d{2}$/.test(value)) return value.padStart(5, '0')
  if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(value)) return value.length <= 12 ? value : fallback
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return fallback
  const sent = parts(date), today = parts(now)
  if (`${sent.year}-${sent.month}-${sent.day}` === `${today.year}-${today.month}-${today.day}`) return `${sent.hour}:${sent.minute}`
  const yesterday = parts(new Date(now.getTime() - 86400000))
  if (`${sent.year}-${sent.month}-${sent.day}` === `${yesterday.year}-${yesterday.month}-${yesterday.day}`) return '昨天'
  return sent.year === today.year ? `${sent.month}-${sent.day}` : `${sent.year}-${sent.month}-${sent.day}`
}
