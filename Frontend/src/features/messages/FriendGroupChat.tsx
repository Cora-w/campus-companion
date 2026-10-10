import { useEffect, useRef } from 'react'
import { Button, Input } from 'antd'
import { Drawer } from '../../navigation/BackOverlays'
import { Icon } from '../../components/shared/Shared'
import { ChatOptions } from './ChatOptions'
import type { initialPeople } from './socialContext'

export type FriendGroup = {
  id: string
  name: string
  members: string[]
  messages: { id: string; text: string; time: string }[]
}

export function FriendGroupChat({ group, people, self, draft, setDraft, send, clear, close }: {
  group: FriendGroup | undefined; people: typeof initialPeople; self: string
  draft: string; setDraft: (value: string) => void; send: () => void
  clear: () => void; close: () => void
}) {
  const log = useRef<HTMLDivElement>(null)
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [group?.id, group?.messages])
  return <Drawer zIndex={1500} open={!!group} placement="bottom" height="100%" title={group ? `${group.name} · ${group.members.length + 1}人` : '群聊'} onClose={close} closeIcon={<Icon name="back"/>} className="conversation-drawer messenger-chat" rootClassName="conversation-root" destroyOnHidden extra={group && <ChatOptions key={group.id} messages={group.messages.map(m => ({ ...m, id: 'chat-' + m.id, author: self }))} clear={clear}/>}>
    {group && <div className="chat-card"><p className="peer-hint">成员：{[self, ...group.members.map(id => people.find(p => p.id === id)?.name || '同学')].join('、')}<br/>本机群聊演示，邀请和消息不会实际送达</p><div ref={log} className="messages peer-messages" role="log" aria-label="群聊记录">{!group.messages.length && <p className="empty-copy">群聊已创建，发条消息打个招呼吧</p>}{group.messages.map(m => <div key={m.id} id={'chat-' + m.id} tabIndex={-1} className="message-row user"><div className="message user">{m.text}<small className="local-status">{m.time} · 已记录，仅本机</small></div></div>)}</div><form className="chat-input" onSubmit={e => { e.preventDefault(); send() }}><Input aria-label="群聊消息" placeholder="发消息…" value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)}/><Button htmlType="submit" type="primary" disabled={!draft.trim()}>发送</Button></form></div>}
  </Drawer>
}
