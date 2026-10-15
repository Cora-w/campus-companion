import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Button, Input } from 'antd'
import type { InputRef } from 'antd'
import type { CampusPost } from '../../data/campusData'
import { UserAvatar } from '../../components/shared/UserAvatar'
import { Icon } from '../../components/shared/Shared'
import './PostComments.css'

export function PostComments({ post, userId, onSend, text, onTextChange, inputRef }: { post: CampusPost; userId: string; onSend: (text: string) => string; text: string; onTextChange: (text: string) => void; inputRef: RefObject<InputRef | null> }) {
  const draft = useRef(text)
  const composing = useRef(false)
  const input = inputRef
  const section = useRef<HTMLElement>(null)
  const composer = useRef<HTMLFormElement>(null)
  const [newIds, setNewIds] = useState<string[]>([])
  const [sentId, setSentId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrolledId = useRef<string | null>(null)
  const sent = !!sentId && post.comments.some(comment => comment.id === sentId)
  useLayoutEffect(() => { draft.current = text }, [text])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useLayoutEffect(() => {
    if (!sent || sentId === scrolledId.current) return
    const row = section.current?.querySelector<HTMLElement>('[data-comment-id="' + sentId + '"]')
    const body = section.current?.closest<HTMLElement>('.ant-drawer-body')
    if (!row || !body || !composer.current) return
    scrolledId.current = sentId
    const bounds = body.getBoundingClientRect()
    const comment = row.getBoundingClientRect()
    const visibleBottom = Math.min(bounds.bottom, composer.current.getBoundingClientRect().top) - 12
    const delta = comment.bottom > visibleBottom ? comment.bottom - visibleBottom : comment.top < bounds.top + 12 ? comment.top - bounds.top - 12 : 0
    if (delta) body.scrollBy({ top: delta, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [sent, sentId, post.comments.length])
  const send = () => {
    const value = draft.current.trim()
    if (!value || composing.current) return
    // Clear the draft synchronously so rapid clicks or repeated Enter cannot duplicate it.
    draft.current = ''
    const id = onSend(value)
    onTextChange(''); setNewIds(previous => [...previous, id]); setSentId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSentId(null), 1800)
    input.current?.focus({ preventScroll: true })
  }
  return <>
    <section ref={section} className="post-detail-comments" aria-label="帖子评论">
      <h3 className="comments-heading">评论 {post.comments.length}</h3>
      {post.comments.length ? post.comments.map(comment => <div className={'campus-comment' + (newIds.includes(comment.id) ? ' comment-just-sent' : '')} key={comment.id} data-comment-id={comment.id}>
        <div className="comment-author"><UserAvatar name={comment.author} userId={comment.authorId} anonymous={comment.authorId === userId}/><b>{comment.author}</b>{newIds.includes(comment.id) && <small className="comment-receipt">刚刚</small>}</div><p>{comment.text}</p>
      </div>) : <p className="subtle">还没有评论，来聊两句。</p>}
    </section>
    <form ref={composer} className="comment-form post-detail-composer" onSubmit={event => { event.preventDefault(); send() }}>
      <span className="comment-send-status" role="status" aria-live="polite" aria-atomic="true">{sent && <><Icon name="check"/>评论已发送</>}</span>
      <Input ref={input} aria-label="评论内容" value={text} maxLength={300} onPressEnter={event => { event.preventDefault(); if (!event.nativeEvent.isComposing && event.keyCode !== 229) send() }} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} onKeyDown={event => { if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }} onChange={event => { draft.current = event.target.value; onTextChange(event.target.value); setSentId(null) }} placeholder="友善地说两句"/>
      <Button className={'comment-send-button' + (sent ? ' comment-send-complete' : '')} icon={sent ? <Icon name="check"/> : undefined} onMouseDown={event => event.preventDefault()} htmlType="submit" type="primary" disabled={!text.trim()}>{sent ? '已发送' : '发送'}</Button>
    </form>
  </>
}
