import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Dispatch, Ref, SetStateAction } from 'react'
import { Alert, Button, Input } from 'antd'
import { uid } from '../../data/data'
import { recommendationFor } from '../discover/placeSearch'
import type { PlaceResult } from '../discover/placeSearch'
import './CompanionChat.css'

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
    <div className="chat-topline"><span className="online-dot"/><small>仅本人可见 · 演示会话</small><button onClick={() => setOffline(!offline)} className="quiet-button" aria-pressed={offline}>{offline ? '恢复连接演示' : '体验断连'}</button><button className="quiet-button" disabled={pending} onClick={() => { reset(); setMessages([]) }}>新对话</button></div>
    <div className="messages" ref={list} aria-live="polite">
      {messages.length === 0 && <div className="chat-empty"><h2>校园的事，都可以聊聊</h2><p>找美食、问校园，或者说说今天的心事。</p><div className="chat-prompts">{['新生有什么好吃的推荐？','周末学校附近有什么好玩的？','最近学习有点累，想聊聊'].map(t => <button className="prompt-button" key={t} onClick={() => send(t)}>{t}</button>)}</div></div>}
      {messages.map(m => <div id={'chat-'+m.id} tabIndex={-1} className={`message-row ${m.role}`} key={m.id}>{m.role === 'assistant' && <span className="message-avatar">AI</span>}<div className={`message ${m.role}`}>{m.text}{m.places && <div className="place-recommendations"><small>校园地点样例 · 非实时数据库结果</small>{m.places.map((p, i) => <article className="recommendation-card" key={p.id}><h3>{i + 1}. {p.name}</h3><b>{p.positiveReviews} 条好评（样例）</b><p>{p.area} · {p.price}</p><details><summary>查看地点详情</summary><p>{p.desc}</p><p>{p.location}</p><p>{p.hours}</p></details></article>)}</div>}</div></div>)}
      {pending && <div className="typing" role="status">小心正在回应…</div>}
      {failed && <Alert type="warning" title="连接暂时中断（演示）" description="你的文字仍在当前会话中。恢复连接后可以重试。" action={<Button onClick={() => send(failed, true)}>重试</Button>}/>}
    </div>
    <p className="chat-disclaimer">预设回复演示 · 对话不公开、不上传服务器</p>
    <form className="chat-input" onSubmit={e => { e.preventDefault(); send(input) }}><Input.TextArea aria-label="向小心发送消息" placeholder="想说什么，都可以慢慢聊…" value={input} onChange={e => setInput(e.target.value)} autoSize={{ minRows: 1, maxRows: 4 }} maxLength={1000} enterKeyHint="send" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }}/><Button type="primary" htmlType="submit" loading={pending} disabled={!input.trim() || pending}>发送</Button></form>
  </section>
}

