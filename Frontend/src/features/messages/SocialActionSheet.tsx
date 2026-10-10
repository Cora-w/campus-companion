import { Button, Checkbox, Input } from 'antd'
import { Drawer } from '../../navigation/BackOverlays'
import { Icon } from '../../components/shared/Shared'
import { UserAvatar } from '../../components/shared/UserAvatar'
import type { initialPeople } from './socialContext'

export function SocialActionSheet({ mode, people, friends, pending, query, setQuery, name, setName, members, setMembers, step, setStep, displayName, openPerson, create, close }: {
  mode: 'add' | 'group' | null; people: typeof initialPeople; friends: string[]; pending: string[]
  query: string; setQuery: (value: string) => void; name: string; setName: (value: string) => void
  members: string[]; setMembers: (value: string[]) => void; step: 'members' | 'details'; setStep: (value: 'members' | 'details') => void
  displayName: (id: string) => string; openPerson: (name: string) => void; create: () => void; close: () => void
}) {
  const selected = people.filter(p => members.includes(p.id) && friends.includes(p.id))
  const search = query.trim().toLocaleLowerCase()
  const results = people.filter(p => (mode === 'add' || friends.includes(p.id)) && (p.name + p.id + displayName(p.id)).toLocaleLowerCase().includes(search))
  const goBack = () => mode === 'group' && step === 'details' ? setStep('members') : close()
  const next = () => {
    if (selected.length < 2) return
    if (!name.trim()) setName((selected.map(p => displayName(p.id)).join('、') + '的群聊').slice(0, 30))
    setStep('details')
  }
  return <Drawer open={!!mode} zIndex={1550} placement="bottom" height="100%" rootClassName="social-flow-root" title={mode === 'add' ? '添加好友' : step === 'members' ? '选择群聊成员' : '确认群聊'} closeIcon={<Icon name="back"/>} onClose={goBack} destroyOnHidden footer={mode === 'group' ? <div className="social-flow-footer"><span>{selected.length ? `已选择 ${selected.length} 位好友` : '至少选择 2 位好友'}<small>与你组成 {selected.length + 1} 人群聊</small></span><Button type="primary" disabled={selected.length < 2 || (step === 'details' && !name.trim())} onClick={step === 'members' ? next : create}>{step === 'members' ? '下一步' : '创建群聊'}</Button></div> : <p className="social-flow-note">通过好友验证后，即可开始聊天</p>}>
    <div className="social-flow-content">
      {mode === 'add' || step === 'members' ? <><Input allowClear prefix={<Icon name="search"/>} className="social-search" aria-label={mode === 'add' ? '搜索同学' : '搜索群聊好友'} placeholder={mode === 'add' ? '搜索昵称 / 用户 ID' : '搜索好友'} value={query} onChange={e => setQuery(e.target.value)}/>
        {mode === 'group' && selected.length > 0 && <div className="social-selected" aria-label="已选群聊成员">{selected.map(p => <button key={p.id} aria-label={'移除' + p.name} onClick={() => setMembers(members.filter(id => id !== p.id))}><UserAvatar name={p.name} anonymous/><small>{displayName(p.id)}</small><span>×</span></button>)}</div>}
        {mode === 'add' && !search ? <div className="social-search-intro"><span><Icon name="profile"/><Icon name="plus"/></span><h2>认识新的校园伙伴</h2><p>输入对方昵称或用户 ID 搜索<br/>发送验证申请，等对方通过</p><div><Icon name="shield"/>先验证，再聊天</div></div> : <><div className="social-section-caption">{mode === 'add' ? `搜索结果 · ${results.length}` : `我的好友 · ${friends.length}`}<small>{mode === 'group' ? '仅好友可加入群聊' : '同学'}</small></div><div className="social-person-list">{results.map(p => <div className="social-person-row contact-item" key={p.id}>{mode === 'group' && <Checkbox aria-label={'邀请' + p.name} checked={members.includes(p.id)} onChange={e => setMembers(e.target.checked ? [...new Set([...members, p.id])] : members.filter(id => id !== p.id))}/>}<UserAvatar className="contact-avatar" name={p.name} anonymous={mode === 'group'}/><div><strong>{displayName(p.id)}</strong><small>{mode === 'add' ? 'ID：' + p.id : p.name}</small></div>{mode === 'add' && (friends.includes(p.id) ? <span className="social-added"><Icon name="check"/>已添加</span> : <Button size="small" type={pending.includes(p.id) ? 'default' : 'primary'} onClick={() => openPerson(p.name)}>{pending.includes(p.id) ? '查看申请' : '添加'}</Button>)}</div>)}</div>{!results.length && <div className="social-no-results"><Icon name="search"/><h3>没有找到匹配的同学</h3><p>试试完整昵称或用户 ID</p></div>}</>}
      </> : <><div className="social-group-cover"><span><Icon name="users"/></span><h2>一起聊聊校园生活</h2><p>确认群名与成员，就可以开始交流</p></div><section className="social-group-settings"><label htmlFor="friend-group-name">群聊名称</label><Input id="friend-group-name" aria-label="群聊名称" value={name} maxLength={30} showCount onChange={e => setName(e.target.value)} placeholder="给群聊起个名字"/><div className="social-section-caption">群聊成员 · {selected.length + 1} 人<button onClick={() => setStep('members')}>修改</button></div><div className="social-group-members"><div><UserAvatar name="我" anonymous/><small>我 · 群主</small></div>{selected.map(p => <div key={p.id}><UserAvatar name={p.name} anonymous/><small>{displayName(p.id)}</small></div>)}</div></section><p className="social-flow-note">本机体验：群聊和消息仅在当前会话中保留，邀请不会实际送达。</p></>}
    </div>
  </Drawer>
}
