import type { Account } from '../../types/domain.ts'
import type { StudentFeedback } from './CampusOperationsContext.ts'

export function feedbackExamples(accounts: Account[], demo: boolean): StudentFeedback[] {
  const student = demo && accounts.find(account => account.id === 'S-DEMO-01' && account.role === 'student' && account.enabled)
  if (!student) return []
  const common = { schoolId: student.schoolId, studentId: student.id, studentName: student.name, images: [], example: true }
  return [
    { ...common, id: 'feedback-example-library', text: '图书馆二楼自习区有几处插座松动，充电时接触不良。希望安排检查，并提示同学暂时不要使用。', time: '10-14 09:20 · 示例', status: '待处理', reply: '', exampleReply: '已收到你的反馈。本例已转交后勤检查图书馆二楼自习区插座，检修前会设置提示。感谢你提供具体位置。' },
    { ...common, id: 'feedback-example-canteen', text: '天舟食堂一楼饮水机旁有积水，路过容易滑倒，希望及时处理。', time: '10-14 08:35 · 示例', status: '处理中', reply: '', exampleReply: '本例已联系后勤处理积水并检查饮水机，现场会放置提示牌。感谢你的反馈。' },
    { ...common, id: 'feedback-example-map', text: '第一次去财务处办事，不知道在哪栋楼。希望校园地图能按办公室名称搜索，并显示门牌。', time: '10-13 16:10 · 示例', status: '已回复', reply: '示例回复：在“校园指南”的地图中搜索“财务处”，可查看致远楼及 201 门牌信息，点击地点还能查看详细介绍。' },
  ]
}
