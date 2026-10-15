import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Dispatch, Ref, SetStateAction } from 'react'
import { Alert, Button, Input } from 'antd'
import { uid } from '../../data/data'
import { recommendationFor } from '../discover/placeSearch'
import type { PlaceResult } from '../discover/placeSearch'
import { Icon } from '../../components/shared/Shared'
import './CompanionChat.css'

function CompanionMark() {
  return <svg viewBox="0 0 80 80" aria-hidden="true"><rect x="1" y="1" width="78" height="78" rx="26" fill="currentColor"/><path d="M23 54V33c0-9 6-15 14-15h6v9h-6c-3 0-5 2-5 6v21ZM57 26v21c0 9-6 15-14 15h-6v-9h6c3 0 5-2 5-6V26Z" fill="#fff9ef"/><path d="m28 45 23-15v10L28 55Z" fill="#e8c5a9"/></svg>
}
const prompts = [
  { label: '校园美食', icon: 'food', text: '新生有什么好吃的推荐？' },
  { label: '周末去哪', icon: 'location', text: '周末学校附近有什么好玩的？' },
  { label: '聊聊心情', icon: 'chat', text: '最近学习有点累，想聊聊' },
]

export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; places?: PlaceResult[] }
export type ChatResetHandle = { reset: () => void }
export function CompanionChat({ messages, setMessages, resetRef }: { messages: ChatMessage[]; setMessages: Dispatch<SetStateAction<ChatMessage[]>>; resetRef?: Ref<ChatResetHandle> }) {
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [offline, setOffline] = useState(false)
  const [failed, setFailed] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setPending(false); setFailed(''); setInput('')
  }
  useImperativeHandle(resetRef, () => ({ reset }))
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [messages, pending, failed])
  const send = (text: string, retry = false) => {
    const value = text.trim()
    if (!value || pending) return
    if (!retry) setMessages(prev => [...prev, { id: uid(), role: 'user', text: value }])
    setInput(''); setFailed(''); setPending(true)
    timer.current = setTimeout(() => {
      setPending(false)
      if (offline) { setFailed(value); return }
      const places = recommendationFor(value)
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', places, text: places ? (places.length ? '按好评数从高到低，找到这些地点：' : '暂时没有符合条件的地点，可以换个范围试试。') : /新生|快递|图书馆|指南/.test(value) ? '可以在「发现 → 指南」查看校园指引，也可以在校园墙向同学提问。这是预设演示回复。' : '我在。你希望先说说今天发生的事，还是一起想想办法？（预设演示回复）' }])
    }, 650)
  }
  return <section className="chat-card companion-chat">
    <div className="chat-topline"><span className={'online-dot' + (offline ? ' is-offline' : '')}/><small>{offline ? '当前断连 · 演示' : '仅本人可见 · 本机会话'}</small><button className="quiet-button companion-new-chat" disabled={pending} onClick={() => { reset(); setMessages([]) }}><Icon name="edit"/>新对话</button></div>
    <div className="messages" ref={list} aria-live="polite">
      {messages.length === 0 && <div className="chat-empty"><div className="companion-intro"><span className="companion-welcome-mark"><CompanionMark/></span><span className="companion-greeting">小心 · 你的校园伙伴</span></div><h2>有话想说，<br/>小心在这里。</h2><p>从一件小事开始，聊聊你的今天。</p><span className="companion-prompt-label">不知道从哪开始？试试这些</span><div className="chat-prompts">{prompts.map(prompt => <button className="prompt-button" key={prompt.label} aria-label={prompt.text} disabled={pending} onClick={() => send(prompt.text)}><span className="companion-prompt-icon"><Icon name={prompt.icon}/></span><span className="companion-prompt-copy"><b>{prompt.label}</b><small>{prompt.text}</small></span></button>)}</div></div>}
      {messages.map(m => <div id={'chat-'+m.id} tabIndex={-1} className={`message-row ${m.role}`} key={m.id}>{m.role === 'assistant' && <span className="message-avatar"><CompanionMark/></span>}<div className={`message ${m.role}`}>{m.text}{m.places && <div className="place-recommendations"><small>校园地点样例 · 非实时数据库结果</small>{m.places.map((p, i) => <article className="recommendation-card" key={p.id}><h3>{i + 1}. {p.name}</h3><b>{p.positiveReviews} 条好评（样例）</b><p>{p.area} · {p.price}</p><details><summary>查看地点详情</summary><p>{p.desc}</p><p>{p.location}</p><p>{p.hours}</p></details></article>)}</div>}</div></div>)}
      {pending && <div className="typing" role="status"><span className="companion-typing-dots" aria-hidden="true"><i/><i/><i/></span>小心正在回应…</div>}
      {failed && <Alert type="warning" title="连接暂时中断（演示）" description="你的文字仍在当前会话中。恢复连接后可以重试。" action={<Button onClick={() => send(failed, true)}>重试</Button>}/>}
    </div>
    <div className="companion-footer"><form className="chat-input" onSubmit={e => { e.preventDefault(); send(input) }}><Input.TextArea aria-label="向小心发送消息" placeholder="想说什么，都可以慢慢聊…" value={input} onChange={e => setInput(e.target.value)} autoSize={{ minRows: 1, maxRows: 4 }} maxLength={1000} enterKeyHint="send" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }}/><Button aria-label="发送消息" type="primary" htmlType="submit" loading={pending} disabled={!input.trim() || pending}>{!pending && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>}</Button></form><div className="companion-footnote"><p className="chat-disclaimer">预设回复演示 · 不上传服务器</p><details className="companion-session-info"><summary>会话说明</summary><div><b>关于这段对话</b><p>当前使用本机预设回复，尚未连接真实 AI。对话不公开，刷新或退出账号后清空。</p><button onClick={() => setOffline(!offline)} aria-pressed={offline}>{offline ? '恢复连接演示' : '体验断连'}</button></div></details></div></div>
  </section>
}

