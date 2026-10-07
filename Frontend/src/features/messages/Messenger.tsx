import { Drawer } from '../../navigation/BackOverlays'
import { ChatOptions } from './ChatOptions'
import { useSocial } from './socialContext'
import { UserAvatar } from '../../components/shared/UserAvatar'
import { useEffect, useRef, useState } from 'react'
import { Button, Dropdown, Input, Switch } from 'antd'
import { Icon, Sheet } from '../../components/shared/Shared'
import { CompanionChat } from './CompanionChat'
import type { ChatMessage, ChatResetHandle } from './CompanionChat'
import { HubChat } from './HubSocial'
import type { HubConversation } from './HubSocial'
import { uid } from '../../data/data'
import './Messenger.css'

type FriendRequest = { id: string; personId: string; direction: 'incoming' | 'outgoing'; message: string; source: string; time: string; status: 'pending' | 'accepted' | 'ignored' }
const requestStatus = { pending: '等待确认', accepted: '已接受', ignored: '已忽略' }

type PeerMessage = { id: string; text: string; mine: boolean; time?: string }
export function Messenger({ active, contact: legacyContact, clearContact: clearLegacyContact, serviceThreads, activeService, openService, closeService, serviceAccess }: { serviceThreads:HubConversation[]; activeService:HubConversation|null; openService:(thread:HubConversation)=>void; closeService:()=>void; serviceAccess:Record<string,boolean>; active: boolean; contact: string | null; clearContact: () => void }) {
  const social = useSocial()
  const people = social.people
  const contact = social.contact || legacyContact
  const clearContact = () => { social.close(); clearLegacyContact() }
  const [remarks,setRemarks]=useState<Record<string,string>>({})
  const displayName=(id:string)=>remarks[id]||people.find(p=>p.id===id)?.name||'同学'
  const [friends, setFriends] = useState(['friend-lin', 'friend-zhou'])
  const [requests, setRequests] = useState<FriendRequest[]>([
    { id: 'request-guide', personId: 'author-3', direction: 'incoming', message: '你好，看到你在问新生报到的事情，我整理了一份校园指南，加个好友方便发给你。', source: '校园墙 · 新生指南', time: '今天 09:20 · 样例', status: 'pending' },
    { id: 'request-weekend', personId: 'author-4', direction: 'incoming', message: '你好！周六想约你一起去艺术楼看摄影展，下午两点方便吗？', source: '校园墙 · 活动搭子', time: '今天 08:45 · 样例', status: 'pending' },
  ])
  const [requestDrafts, setRequestDrafts] = useState<Record<string, string>>({})
  const incoming = requests.filter(r => r.direction === 'incoming' && r.status === 'pending')
  const [allowRequests, setAllowRequests] = useState(true)
  const [panel, setPanel] = useState<'contacts' | 'requests' | null>(null)
  const [thread, setThread] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const draft = drafts[thread || ''] || ''
  const setDraft = (value: string) => { if (thread) setDrafts(prev => ({ ...prev, [thread]: value })) }
  const [filter, setFilter] = useState('全部')
  const inboxScroll = useRef<HTMLDivElement>(null)
  useEffect(() => { inboxScroll.current?.scrollTo({ top: 0 }) }, [filter, search])
  const [unread, setUnread] = useState<string[]>(['friend-lin', 'friend-zhou'])
  const [pinned, setPinned] = useState<string[]>([])
  const aiReset = useRef<ChatResetHandle>(null)
  const clearAi = () => { aiReset.current?.reset(); setAiMessages([]) }
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<Record<string, PeerMessage[]>>({
    'friend-lin': [{ id: 'seed-lin', text: people[0].note, mine: false }],
    'friend-zhou': [{ id: 'seed-zhou', text: people[1].note, mine: false }],
  })
  const [order, setOrder] = useState(['friend-lin', 'friend-zhou'])
  const peerLog = useRef<HTMLDivElement>(null)
  useEffect(() => { peerLog.current?.scrollTo({ top: peerLog.current.scrollHeight }) }, [thread, conversations])
  const person = people.find(p => p.id === thread)
  const target = people.find(p => p.id === contact)
  const threadOrigin = useRef<{name?:string;panel:typeof panel}>({panel:null})
  const requestOrigin = useRef<string | undefined>(undefined)
  const closeThread = () => { setThread(null); setPanel(threadOrigin.current.panel); if(threadOrigin.current.name) social.open(threadOrigin.current.name) }
  const closeRequests = () => { setPanel(null); if(requestOrigin.current) { social.open(requestOrigin.current); requestOrigin.current=undefined } }
  const openThread = (id: string) => { if (id !== 'ai' && !friends.includes(id)) return; threadOrigin.current={name:target?.name,panel}; setThread(id); setUnread(prev => prev.filter(item => item !== id)); setPanel(null); clearContact() }
  const accept = (id: string) => {
    if (!requests.some(r => r.personId === id && r.direction === 'incoming' && r.status === 'pending')) return
    setFriends(prev => [...new Set([...prev, id])])
    setOrder(prev => [id, ...prev.filter(item => item !== id)])
    setRequests(prev => prev.map(r => r.personId === id && r.status === 'pending' ? { ...r, status: 'accepted' } : r))
  }
  const showRequests = () => { requestOrigin.current=target?.name; clearContact(); setContactSearch(''); setPanel('requests') }
  const submitRequest = () => {
    if (!target || friends.includes(target.id) || !requestDrafts[target.id]?.trim() || requests.some(r => r.personId === target.id && r.status === 'pending')) return
    setRequests(prev => [{ id: uid(), personId: target.id, direction: 'outgoing', message: requestDrafts[target.id].trim(), source: target.note, time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), status: 'pending' }, ...prev])
    setRequestDrafts(prev => ({ ...prev, [target.id]: '' }))
  }
  const targetRequest = requests.find(r => r.personId === contact && r.status === 'pending')
  const send = () => {
    if (!thread || !friends.includes(thread) || !draft.trim()) return
    const message = { id: uid(), text: draft.trim(), mine: true, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
    setConversations(prev => ({ ...prev, [thread]: [...(prev[thread] || []), message] }))
    setOrder(prev => [thread, ...prev.filter(id => id !== thread)]); setDraft('')
  }
  const removeFriend=(id:string)=>{
    setFriends(prev=>prev.filter(x=>x!==id));setOrder(prev=>prev.filter(x=>x!==id));setPinned(prev=>prev.filter(x=>x!==id));setUnread(prev=>prev.filter(x=>x!==id))
    setConversations(prev=>({...prev,[id]:[]}));setDrafts(prev=>({...prev,[id]:''}));setRemarks(prev=>({...prev,[id]:''}));setRequests(prev=>prev.filter(r=>r.personId!==id));setThread(null);setPanel(threadOrigin.current.panel);clearContact()
    if(threadOrigin.current.name)social.open(threadOrigin.current.name)
  }
  const avatar = (name: string) => <UserAvatar className="contact-avatar" name={name}/>
  const query = search.trim().toLocaleLowerCase()
  const matches = (value: string) => value.toLocaleLowerCase().includes(query)
  const showAi = filter === '全部' && matches('小心 AI 伙伴 ' + (aiMessages.at(-1)?.text || '找好吃的、好玩的，也可以聊聊今天'))
  const visibleServices = serviceThreads.filter(t => (filter === '全部' || (filter === '群聊' && t.kind === 'group') || (filter === '交易' && t.kind === 'market')) && matches(t.title + t.person))
  const visiblePeers = order.filter(id => friends.includes(id) && (filter === '全部' || filter === '好友' || (filter === '未读' && unread.includes(id))) && matches(displayName(id) + (people.find(p => p.id === id)?.name || '') + (conversations[id]?.at(-1)?.text || '') + (drafts[id] || ''))).sort((a, b) => Number(pinned.includes(b)) - Number(pinned.includes(a)))
  return <><HubChat conversation={activeService} close={closeService} allowed={!!activeService && !!serviceAccess[activeService.id]}/>
    {active && <section className="messenger messenger-refresh">
      <div className="messenger-tools"><Input allowClear aria-label="搜索会话" placeholder="搜索" value={search} onChange={e => setSearch(e.target.value)} prefix={<Icon name="search"/>}/><button className="inbox-address-book" aria-label="通讯录" title="通讯录" onClick={() => { setContactSearch(''); setPanel('contacts') }}><Icon name="users"/><span>通讯录</span></button></div>
      <button className="request-entry inbox-invitation" aria-label="新的朋友" onClick={() => { setContactSearch(''); setPanel('requests') }}><span className="invitation-faces" aria-hidden="true">{incoming.length ? incoming.slice(0, 2).map(r => <span key={r.id}>{people.find(p => p.id === r.personId)?.name.slice(0, 1)}</span>) : <Icon name="profile"/>}</span><span className="invitation-copy"><strong>{incoming.length ? incoming.length + ' 位同学想认识你' : '认识新的校园伙伴'}</strong><small>{incoming.length ? '看看他们的招呼，开启一段新对话' : '好友申请与处理记录'}</small></span>{incoming.length > 0 && <b>{incoming.length}</b>}<Icon name="next"/></button>
      <div className="inbox-filters" aria-label="会话分类">{['全部', '未读', '好友', '群聊', '交易'].map(value => <button key={value} aria-label={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}{value === '未读' && unread.length > 0 && <span>{unread.length}</span>}</button>)}</div>
      <div className="inbox-list-heading"><span>{query ? '搜索结果' : filter === '全部' ? '最近会话' : filter + '会话'}</span>{unread.length > 0 && <button onClick={() => setUnread([])}>全部已读</button>}</div>
      <div ref={inboxScroll} className="inbox-scroll-area" tabIndex={0} role="region" aria-label="会话列表"><div className="conversation-list">
        {showAi && <button className="conversation-row pinned inbox-ai" onClick={() => openThread('ai')}><span className="contact-avatar ai-avatar">AI</span><span className="conversation-copy"><strong>小心<em>AI 伙伴</em></strong><small>{aiMessages.at(-1)?.text || '找美食、问校园，或聊聊今天的心情'}</small></span><span className="conversation-meta"><span>置顶</span></span></button>}
        {visiblePeers.map(id => { const p = people.find(p => p.id === id)!; const latest = conversations[id]?.at(-1); return <div className={'inbox-peer' + (pinned.includes(id) ? ' is-pinned' : '')} key={id}>
          <button className="conversation-row" aria-label={'打开与' + displayName(id) + '的聊天'} onClick={() => openThread(id)}><span className="inbox-avatar-wrap"><UserAvatar className="contact-avatar" name={p.name}/>{unread.includes(id) && <b className="inbox-unread" aria-label="未读会话"/>}</span><span className="conversation-copy"><strong>{displayName(id)}{pinned.includes(id) && <em>置顶</em>}</strong><small>{drafts[id]?.trim() ? <><b className="inbox-draft">[草稿] </b>{drafts[id]}</> : latest?.text || '打个招呼，开始聊天'}</small></span><span className="conversation-meta"><span>{latest?.time || '样例'}</span></span></button>
          <Dropdown trigger={['click']} menu={{ items: [{ key: 'pin', label: pinned.includes(id) ? '取消置顶' : '置顶会话' }, { key: 'unread', label: unread.includes(id) ? '标记已读' : '标记未读' }], onClick: ({ key }) => { const update = (prev: string[]) => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]; if (key === 'pin') setPinned(update); else setUnread(update) } }}><button className="inbox-more" aria-label={p.name + '的会话操作'}><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg></button></Dropdown>
        </div> })}
        {visibleServices.map(t => <button className="conversation-row service-thread" key={t.id} onClick={() => openService(t)}><span className={'contact-avatar service-avatar ' + t.kind}><Icon name={t.kind === 'market' ? 'bag' : 'users'}/></span><span className="conversation-copy"><strong>{t.person}<em>{t.kind === 'market' ? '交易私信' : '活动群聊'}</em></strong><small>{t.title}</small></span><span className="conversation-meta"><Icon name="next"/></span></button>)}
        {!showAi && !visiblePeers.length && !visibleServices.length && <div className="inbox-empty"><Icon name={query ? 'search' : 'chat'}/><h3>{query ? '没有找到相关会话' : filter === '未读' ? '未读消息都看完了' : '暂时没有' + filter + '会话'}</h3><p>{query ? '试试其他名字或消息关键词' : filter === '群聊' ? '加入校园活动后，在这里继续交流' : filter === '交易' ? '联系闲置物品卖家后，在这里查看私信' : '找位同学，开启新的话题吧'}</p><button onClick={() => { setSearch(''); setFilter('全部') }}>查看全部会话</button></div>}
      </div><p className="messenger-note">演示会话 · 消息与草稿仅保留在本次体验中</p></div>
    </section>}
    <Sheet zIndex={1500} title={panel === 'requests' ? '新的朋友' : '通讯录'} open={!!panel && !thread} onClose={closeRequests}>
      <div className="contact-panel"><Input aria-label="搜索联系人" placeholder={panel === 'contacts' ? '搜索好友昵称' : '搜索申请人昵称'} value={contactSearch} onChange={e => setContactSearch(e.target.value)}/>
      {panel === 'requests' && <><div className="request-settings"><span>允许新的好友申请</span><Switch checked={allowRequests} onChange={setAllowRequests}/></div><p className="subtle">关闭后不再接收新申请，已有申请仍可处理。重复申请合并为一条。</p></>}
      {panel === 'contacts' && people.filter(p => friends.includes(p.id) && (p.name+displayName(p.id)).includes(contactSearch)).map(p => <div className="contact-item" key={p.id}>{avatar(p.name)}<div><strong>{displayName(p.id)}</strong><small>{remarks[p.id]?'昵称：'+p.name:'已互为好友'}</small></div><Button onClick={() => openThread(p.id)}>聊天</Button></div>)}
      {panel === 'contacts' && !people.some(p => friends.includes(p.id) && (p.name+displayName(p.id)).includes(contactSearch)) && <p className="empty-copy">未找到好友</p>}
      {panel === 'requests' && <>{(['incoming', 'outgoing'] as const).map(direction => <section className="friend-request-section" key={direction}><h3>{direction === 'incoming' ? '收到的申请' : '我发出的申请'}</h3>{requests.filter(r => r.direction === direction && people.find(p => p.id === r.personId)?.name.includes(contactSearch)).map(r => {
        const p = people.find(p => p.id === r.personId)!
        return <article className="friend-request-card" key={r.id}><div className="friend-request-heading">{avatar(p.name)}<div><strong>{p.name}</strong><small>{r.time}</small></div><span className={`friend-request-status ${r.status}`}>{requestStatus[r.status]}</span></div><p className="friend-request-message">{r.message}</p><small className="friend-request-source">来源：{r.source}</small><div className="friend-request-actions">{r.status === 'pending' && direction === 'incoming' ? <><Button onClick={() => setRequests(prev => prev.map(item => item.id === r.id ? { ...item, status: 'ignored' } : item))}>忽略</Button><Button type="primary" onClick={() => accept(r.personId)}>接受</Button></> : r.status === 'accepted' ? <Button onClick={() => openThread(r.personId)}>发消息</Button> : direction === 'outgoing' && r.status === 'pending' ? <small>等待对方确认，通过后即可聊天</small> : null}</div></article>
      })}{!requests.some(r => r.direction === direction && people.find(p => p.id === r.personId)?.name.includes(contactSearch)) && <p className="empty-copy">{contactSearch ? '没有匹配的申请' : direction === 'incoming' ? '暂无收到的申请' : '暂无发出的申请，可从帖子详情联系作者。'}</p>}</section>)}<p className="subtle">申请和处理记录保存在本次体验中，刷新后重置；演示申请不会实际送达。</p></>}
      </div>
    </Sheet>
    <Sheet zIndex={1600} title="联系同学" open={!!target} onClose={clearContact}>{target && <div className="contact-profile">{avatar(target.name)}<h2>{displayName(target.id)}</h2>{remarks[target.id]&&<p className="subtle">昵称：{target.name}</p>}<p>{target.note}</p>
      {friends.includes(target.id) ? <Button type="primary" block onClick={() => openThread(target.id)}>发消息</Button> : targetRequest ? <div className="friend-request-result"><p>{targetRequest.direction === 'incoming' ? '对方的申请说明' : '已发送好友申请 · 等待对方确认'}</p><blockquote>{targetRequest.message}</blockquote>{targetRequest.direction === 'incoming' && <Button type="primary" block onClick={() => accept(target.id)}>接受对方的好友申请</Button>}<Button block className="spaced" onClick={showRequests}>查看好友申请</Button></div> : <form className="friend-request-form" onSubmit={e => { e.preventDefault(); submitRequest() }}><label className="field-label" htmlFor="friend-request-message">申请说明</label><Input.TextArea id="friend-request-message" placeholder="介绍一下自己，或说说想了解什么、想约对方一起做什么…" value={requestDrafts[target.id] || ''} onChange={e => setRequestDrafts(prev => ({ ...prev, [target.id]: e.target.value }))} maxLength={200} showCount rows={4}/><p className="subtle">对方会在「消息 → 新的朋友」看到你的说明，接受后即可聊天。</p><Button type="primary" block htmlType="submit" disabled={!requestDrafts[target.id]?.trim()}>发送好友申请</Button><p className="demo-note">本次为演示，申请不会实际送达。</p></form>}
    </div>}</Sheet>
    <Drawer extra={thread&&<ChatOptions friend={thread!=='ai'&&person?{name:person.name,remark:remarks[thread]||'',saveRemark:value=>setRemarks(prev=>({...prev,[thread]:value})),remove:()=>removeFriend(thread)}:undefined} key={thread} messages={thread==='ai'?aiMessages.map(m=>({id:'chat-'+m.id,text:m.text,author:m.role==='user'?'我':'小心'})):(conversations[thread]||[]).map(m=>({id:'chat-'+m.id,text:m.text,author:m.mine?'我':displayName(thread),time:m.time}))} clear={()=>thread==='ai'?clearAi():setConversations(prev=>({...prev,[thread]:[]}))} profile={thread==='ai'?undefined:()=>social.open(person!.name)} pinned={pinned.includes(thread)} togglePin={thread==='ai'?undefined:()=>setPinned(prev=>prev.includes(thread)?prev.filter(id=>id!==thread):[...prev,thread])}/>} zIndex={1500} open={!!thread} placement="bottom" height="100%" title={thread === 'ai' ? '小心 · AI 伙伴' : displayName(thread || '')} onClose={closeThread} className="conversation-drawer messenger-chat" rootClassName="conversation-root" closeIcon={<Icon name="back"/>} destroyOnHidden>
      {thread === 'ai' ? <CompanionChat resetRef={aiReset} messages={aiMessages} setMessages={setAiMessages}/> : <div className="chat-card"><p className="peer-hint"><Icon name="shield"/>已互为好友 · 消息仅保存在本次体验中</p><div ref={peerLog} className="messages peer-messages" role="log" aria-label="好友聊天记录">{(conversations[thread || ''] || []).map(m => <div id={'chat-'+m.id} tabIndex={-1} className={`message-row ${m.mine ? 'user' : 'assistant'}`} key={m.id}>{!m.mine && avatar(person?.name || '')}<div className={`message ${m.mine ? 'user' : 'assistant'}`}>{m.text}{m.mine && <small className="local-status">{m.time} · 已记录，仅本机</small>}</div></div>)}</div><form className="chat-input" onSubmit={e => { e.preventDefault(); send() }}><Input aria-label="给好友发消息" placeholder="发消息，聊聊校园里的事…" enterKeyHint="send" value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)}/><Button type="primary" htmlType="submit" disabled={!draft.trim()}>发送</Button></form></div>}
    </Drawer>
  </>
}

