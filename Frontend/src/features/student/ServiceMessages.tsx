import { useState } from 'react'
import { isDemoMode } from '../../services/auth'
import { StudentNotices } from '../admin/CampusServiceViews'
import './ServiceMessages.css'

export type ServiceMessageTarget = { type: 'post'; postId: string } | { type: 'friend-requests' }
type ServiceMessage = { id: string; title: string; body: string; time: string; target: ServiceMessageTarget }
const examples: ServiceMessage[] = [
  { id: 'demo-comment', title: '你的帖子收到了评论', body: '小林：想看早餐合集，早八真的很需要。', time: '今天 10:51 · 示例', target: { type: 'post', postId: 'post-1' } },
  { id: 'demo-friend-guide', title: '收到好友申请', body: '学姐的备忘录希望添加你为好友。', time: '今天 09:20 · 示例', target: { type: 'friend-requests' } },
  { id: 'demo-friend-weekend', title: '收到好友申请', body: '周末不宅希望添加你为好友。', time: '今天 08:45 · 示例', target: { type: 'friend-requests' } },
]

export function ServiceMessages({ onOpen }: { onOpen: (target: ServiceMessageTarget) => void }) {
  const [read, setRead] = useState<string[]>([])
  return <div className="service-messages">
    {isDemoMode && <section aria-label="服务消息示例">
      <p className="service-message-note">示例消息 · 点击查看跳转效果</p>
      <div className="service-message-list">{examples.map(item => <button key={item.id} className="service-message-card" aria-label={`查看${item.title}`} onClick={() => {
        setRead(previous => previous.includes(item.id) ? previous : [...previous, item.id])
        onOpen(item.target)
      }}>
        <span className="service-message-heading"><b>{item.title}</b><small>{read.includes(item.id) ? '已读' : '未读'}</small></span>
        <time>{item.time}</time><p>{item.body}</p>
        <span className="service-message-link">{item.target.type === 'post' ? '查看帖子与评论' : '处理好友申请'}</span>
      </button>)}</div>
    </section>}
    <StudentNotices/>
  </div>
}
