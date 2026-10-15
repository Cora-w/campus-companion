import { useEffect, useRef, useState } from 'react'
import { Button, Input, Switch } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { Drawer, Modal } from '../../navigation/BackOverlays'
import { Icon } from '../../components/shared/Shared'
import type { Session } from '../../data/data'
import { uid } from '../../data/data'
import type { SupportRequest } from '../../data/hubData'
import { initialListeningState, listeningReply } from './listeningModel'
import type { ListeningState } from './listeningModel'
import './ListeningSpace.css'
import { Assessment } from './Assessment'
import type { AssessmentKind } from './assessmentModel'

type Message = { id: string; text: string; mine: boolean; time: string; suggestions?: string[]; safety?: boolean }
type Panel = 'menu' | 'privacy' | 'support' | 'memory' | 'feedback' | null
type Memory = { id: string; text: string }
function Leaf() { return <svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 24c1-8 3-12 7-18" stroke="currentColor" strokeWidth="1.5"/><path d="M15 16C15 8 21 3 26 3c0 7-4 13-11 13ZM13 21C5 20 3 14 3 9c7 0 11 5 10 12Z" fill="currentColor" opacity=".85"/></svg> }
function SendArrow() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg> }

export function ListeningSpace({ open, close, session, requests, requestSupport }: { open: boolean; close: () => void; session: Session; requests: SupportRequest[]; requestSupport: (topic: string) => void }) {
  const allowed = open && session.role === 'student'
  const [assessment, setAssessment] = useState<AssessmentKind | null>(null)
  const [view, setView] = useState<'entry' | 'chat'>('entry')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [dialogue, setDialogue] = useState<ListeningState>(initialListeningState)
  const [panel, setPanel] = useState<Panel>(null)
  const panelTrail = useRef<Panel[]>([])
  const [clearOpen, setClearOpen] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memories, setMemories] = useState<Memory[]>([])
  const [memoryDraft, setMemoryDraft] = useState('')
  const [editingMemory, setEditingMemory] = useState<string | null>(null)
  const [supportDraft, setSupportDraft] = useState('')
  const [supportConsent, setSupportConsent] = useState(false)
  const [supportAttempt, setSupportAttempt] = useState(false)
  const [feedback, setFeedback] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const editor = useRef<TextAreaRef>(null)
  const pending = requests.find(r => r.studentId === session.id && r.status === '待联系')
  useEffect(() => { if (allowed && view === 'chat') log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'instant' }) }, [messages, view, allowed])
  const openPanel = (next: Panel) => {
    if (next === null) { panelTrail.current = []; setPanel(null); return }
    if (panel) panelTrail.current.push(panel)
    else panelTrail.current = []
    setPanel(next)
  }
  const closePanel = () => setPanel(panelTrail.current.pop() ?? null)
  const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const send = () => {
    const text = draft.trim()
    if (!allowed || !text) return
    const response = listeningReply(text, dialogue)
    setMessages(prev => [...prev, { id: uid(), text, mine: true, time: now() }, { id: uid(), text: response.text, mine: false, time: now(), suggestions: response.suggestions, safety: response.safety }])
    setDialogue(response.state); setDraft(''); setView('chat')
  }
  const back = () => {
    if (view === 'chat') { setView('entry'); return }
    close()
  }
  const saveMemory = () => {
    if (!memoryEnabled || !memoryDraft.trim()) return
    const text = memoryDraft.trim()
    setMemories(prev => editingMemory ? prev.map(m => m.id === editingMemory ? { ...m, text } : m) : [...prev, { id: uid(), text }])
    setEditingMemory(null); setMemoryDraft('')
  }
  const composer = <form className="ls-composer" onSubmit={e => { e.preventDefault(); send() }}>
    <Input.TextArea ref={editor} aria-label="倾诉内容" placeholder={view === 'entry' ? '此刻，我想说……' : '慢慢写，我在听…'} value={draft} maxLength={2000} autoSize={{ minRows: 1, maxRows: 4 }} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}/>
    <button type="submit" className="ls-send" aria-label="发送倾诉消息" disabled={!draft.trim()}><SendArrow/></button>
  </form>
  return <><Drawer open={allowed} zIndex={1100} placement="bottom" height="100%" rootClassName="listening-space-root" className="ls-drawer" title={<div className="ls-title">倾诉空间{view === 'chat' && <small>AI 陪伴 · 演示</small>}</div>} onClose={back} closeIcon={<Icon name="back"/>} extra={<button className="ls-more" aria-label="倾诉空间更多" onClick={() => openPanel('menu')}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>}>
    <div className={'ls-space ' + (view === 'entry' ? 'ls-entry' : 'ls-chat')}>
      {view === 'entry' ? <><div className="ls-window" aria-hidden="true"/><div className="ls-welcome"><h1>今天，<br/>想从哪里说起？</h1><p>不用整理好情绪，想到什么就说什么。</p></div><div className="ls-entry-actions">{composer}<div className="ls-shortcuts"><button onClick={() => setAssessment('mental')}><Icon name="like"/>心理测试</button><button onClick={() => setAssessment('personality')}><Icon name="users"/>性格测试</button><button aria-label="找人聊聊" onClick={() => openPanel('support')}><Icon name="profile"/>找人聊聊</button></div>{messages.length > 0 && <button className="ls-resume" onClick={() => setView('chat')}>继续刚才的对话 </button>}</div><div className="ls-entry-footer"><span/>不急，我们慢慢来。<span/></div><p className="ls-demo-note">本机对话演示 · 未接入真实 AI</p></> : <><div ref={log} className="ls-messages" role="log" aria-label="倾诉对话">{!messages.length && <div className="ls-empty"><Leaf/><p>可以从一件小事开始。<br/>说不清楚也没关系。</p></div>}{messages.map(m => <div key={m.id} className={'ls-message-row ' + (m.mine ? 'mine' : 'assistant')}>
        {!m.mine && <span className="ls-leaf-avatar"><Leaf/></span>}<div className="ls-message-column"><div className="ls-bubble">{m.text}{m.suggestions && <ol className="ls-suggestions">{m.suggestions.map(s => <li key={s}>{s}</li>)}</ol>}{m.safety && <button className="ls-support-link" onClick={() => openPanel('support')}>查看真人与紧急支持 </button>}</div><small>{m.time}</small></div>
      </div>)}</div><div className="ls-chat-bottom">{memoryEnabled && memories.length > 0 && <p className="ls-memory-reminder">你保存的提醒：{memories.at(-1)?.text}</p>}{composer}<p className="ls-demo-note">回复为情境样例，不代表专业判断</p></div></>}
    </div>
  </Drawer>
  <Drawer open={allowed && !!panel} zIndex={1600} placement="bottom" rootClassName="ls-panel-root" title={panel === 'menu' ? '更多' : panel === 'privacy' ? '隐私与说明' : panel === 'support' ? '真人支持' : panel === 'memory' ? '我的记忆' : '现在感觉怎么样？'} onClose={closePanel} closeIcon={<Icon name="back"/>}>
    {panel === 'menu' && <div className="ls-menu"><button aria-label="找人聊聊" onClick={() => openPanel('support')}><Icon name="profile"/>找人聊聊<span>留言与支持</span></button><button aria-label="我的记忆" onClick={() => openPanel('memory')}><Icon name="bookmark"/>我的记忆<span>{memoryEnabled ? '已开启' : '未开启'}</span></button><button aria-label="隐私与说明" onClick={() => openPanel('privacy')}><Icon name="shield"/>隐私与说明</button><button aria-label="聊后感受" onClick={() => { setFeedback(''); openPanel('feedback') }}><Icon name="chat"/>聊后感受<span>可跳过</span></button><button aria-label="重新开始" onClick={() => setClearOpen(true)}><Icon name="refresh"/>重新开始<span>清空当前对话</span></button></div>}
    {panel === 'privacy' && <div className="ls-panel-copy"><h3>按你的节奏聊</h3><p>现在是本机交互演示。自由输入由有限的情境样例回应，可能无法理解你的意思，你可以纠正、换话题或停止。</p><p>聊天不发布到校园墙，也不默认交给教师或管理员。发送真人联系请求前，需要你确认具体分享内容。</p><p>记忆默认关闭，只保存你确认的文字。本次对话和记忆仅保留到退出账号或刷新；正式服务的保存期限、服务方数据处理和安全例外需要学校确认。</p><p>这不是实时专业服务，不能提供诊断或保证情绪改善。AI 服务、真人排班和安全接收流程尚未接入。</p></div>}
    {panel === 'memory' && <div className="ls-panel-copy"><div className="ls-memory-switch"><div><b>开启记忆</b><small>只保留你亲自确认的文字</small></div><Switch aria-label="开启倾诉记忆" checked={memoryEnabled} onChange={setMemoryEnabled}/></div><p>本机体验中作为聊天提醒展示，不会发送给老师。关闭后不新增、不展示提醒；已保存内容可随时修改或清空。退出账号或刷新后清空。</p>{memories.map(m => <article className="ls-memory-item" key={m.id}><p>{m.text}</p><div><Button size="small" onClick={() => { setEditingMemory(m.id); setMemoryDraft(m.text) }}>修改</Button><Button size="small" danger onClick={() => { setMemories(prev => prev.filter(x => x.id !== m.id)); if (editingMemory === m.id) { setEditingMemory(null); setMemoryDraft('') } }}>删除</Button></div></article>)}{!memories.length && <p className="ls-muted">还没有记忆。你可以留下一句希望被记住的话。</p>}<form onSubmit={e => { e.preventDefault(); saveMemory() }}><label htmlFor="ls-memory-text">{editingMemory ? '修改这条记忆' : '想记住的内容'}</label><Input.TextArea id="ls-memory-text" aria-label="想记住的内容" disabled={!memoryEnabled} value={memoryDraft} maxLength={200} rows={3} onChange={e => setMemoryDraft(e.target.value)} placeholder="例如：难受时，希望先听我说"/><Button type="primary" htmlType="submit" disabled={!memoryEnabled || !memoryDraft.trim()}>确认保存这段文字</Button>{editingMemory && <Button onClick={() => { setEditingMemory(null); setMemoryDraft('') }}>取消修改</Button>}</form>{memories.length > 0 && <Button danger type="text" onClick={() => { setMemories([]); setEditingMemory(null); setMemoryDraft('') }}>清空所有记忆</Button>}</div>}
    {panel === 'support' && <div className="ls-panel-copy"><h3>可以先留一句话</h3><p>老师的服务时段、回复期限及文字／语音预约方式待学校确认。目前只演示授权留言，不代表实时接待或实际送达。</p>{pending && <div className="ls-support-status" role="status"><b>已有待联系留言 · 演示</b><p>{pending.topic}</p></div>}{requests.filter(r => r.studentId === session.id && r.status === '已受理').map(r => <p key={r.id} className="ls-support-status">老师已受理本机演示请求：{r.topic}</p>)}<form onSubmit={e => { e.preventDefault(); if (allowed && supportDraft.trim() && supportConsent && !pending) { requestSupport(supportDraft.trim()); setSupportAttempt(true) } }}><label htmlFor="ls-support-text">只分享你愿意交给老师的内容</label><Input.TextArea id="ls-support-text" aria-label="给老师的留言" value={supportDraft} maxLength={500} rows={4} onChange={e => { setSupportDraft(e.target.value); setSupportAttempt(false) }}/><div className="ls-share-preview"><b>分享预览</b><p>{supportDraft.trim() || '填写后在这里查看'}</p><small>还会分享账号：{session.loginAccount || session.id}，姓名：{session.name}。不包含聊天原文或记忆。</small></div><label className="ls-consent"><input type="checkbox" checked={supportConsent} onChange={e => setSupportConsent(e.target.checked)}/>我同意将上面预览的内容交给本校可接收请求的心理老师。</label><Button type="primary" htmlType="submit" disabled={!supportDraft.trim() || !supportConsent || !!pending}>{pending ? '已有待联系留言' : '确认记录授权留言（演示）'}</Button>{supportAttempt && !pending && <p role="alert">当前没有可接收的本校老师，请先联系学校确认支持方式。</p>}</form><section className="ls-emergency"><h3>需要及时帮助时</h3><p>若危险就在眼前，请联系身边可信任的人或拨打 110 / 120。心理援助可拨打 12356，具体服务时间以当地为准。</p><div><a href="tel:12356">心理援助 12356</a><a href="tel:120">急救 120</a><a href="tel:110">紧急求助 110</a></div></section></div>}
    {panel === 'feedback' && <div className="ls-panel-copy"><p>只是了解你的体验，不评价你。可以不回答。</p><div className="ls-feedback-options">{['好一点', '差不多', '更难受'].map(value => <button key={value} aria-pressed={feedback === value} onClick={() => setFeedback(value)}>{value}</button>)}</div>{feedback && <p role="status">{feedback === '更难受' ? '可以先停下来。如果愿意，这里有真人支持入口。' : '谢谢你告诉我。之后怎么聊，仍由你决定。'}</p>}{feedback === '更难受' && <Button onClick={() => openPanel('support')}>查看真人支持</Button>}<Button type="text" onClick={() => openPanel(null)}>跳过，回到对话</Button></div>}
  </Drawer>
  {allowed && assessment && <Assessment kind={assessment} close={() => setAssessment(null)} support={() => { setAssessment(null); openPanel('support') }} />}
  <Modal open={allowed && clearOpen} title="重新开始这段对话？" onCancel={() => setClearOpen(false)} onOk={() => { setMessages([]); setDialogue(initialListeningState); setDraft(''); setView('entry'); setClearOpen(false); openPanel(null) }} okText="清空并重新开始" cancelText="保留对话"><p>当前对话和输入草稿会清空。你亲自保存的记忆不会被清空，可在“我的记忆”中单独删除。</p></Modal>
  </>
}
