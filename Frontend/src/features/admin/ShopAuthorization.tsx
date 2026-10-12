import { useState } from 'react'
import { Button, Input, Modal, Switch, Tag } from 'antd'
import type { Account } from '../../types/domain'
import type { Dispatch, SetStateAction } from 'react'
import { Drawer } from '../../navigation/BackOverlays'
import { Icon } from '../../components/shared/Shared'

export function ShopAuthorization({ accounts, setAccounts, log }: { accounts: Account[]; setAccounts: Dispatch<SetStateAction<Account[]>>; log: (action: string) => void }) {
  const [selectedId,setSelectedId] = useState<string|null>(null)
  const selected = accounts.find(account=>account.id===selectedId&&account.role==='student')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, contextHolder] = Modal.useModal()
  const students = accounts.filter(a => a.role === 'student')
  const visible = students.filter(a => `${a.name} ${a.id}`.toLowerCase().includes(search.trim().toLowerCase()))
  const toggle = (account: Account) => {
    const granting = !account.shopManagement
    modal.confirm({ title: granting ? '授予开店权限？' : '收回开店权限？', content: `${account.name}（${account.id}）：${granting ? '授权后，“我的”将出现“管理店铺”，可创建并经营自己的小卖部。' : '管理入口将隐藏，店铺暂停接收新订单。店铺资料和已有订单保留，再次授权后可继续管理。'}`, okText: granting ? '确认授权' : '确认收回', cancelText: '取消', okButtonProps: { danger: !granting }, onOk: () => {
      setAccounts(previous => previous.map(a => a.id === account.id && a.role === 'student' && (!granting || a.enabled) ? { ...a, shopManagement: granting } : a))
      log(`${granting ? '授予' : '收回'}学生开店权限 ${account.id}`)
      setNotice(`${account.name}的开店权限已${granting ? '授予' : '收回'}。`)
    } })
  }
  return <section className="admin-panel admin-shop-authorization">
    {contextHolder}
    <div className="admin-panel-heading"><h2>学生开店授权</h2><Tag color="blue">{students.filter(a => a.enabled && a.shopManagement).length} 人已授权</Tag></div>
    <p>为学生授予或收回开店权限。</p>
    <Input aria-label="搜索开店授权学生" prefix={<Icon name="search"/>} value={search} onChange={e => setSearch(e.target.value)} allowClear placeholder="搜索学生姓名或账号"/>
    {notice && <p role="status" className="admin-shop-notice">{notice}</p>}
    <div className="admin-shop-students">{visible.map(a => <article key={a.id} data-shop-account={a.id} role="button" tabIndex={0} aria-label={`查看${a.name}开店权限`} onClick={()=>setSelectedId(a.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(a.id)}}}><span className="admin-avatar admin-avatar-student">{a.name.slice(0, 1)}</span><div><b>{a.name}</b><small>{a.id}</small><small>{!a.enabled ? '账号已停用' : a.shopManagement ? '已授权 · 可管理自己的店铺' : '未授权'}</small></div><span className="staff-row-link">查看详情 ›</span></article>)}</div>
    {!visible.length && <div className="admin-empty"><Icon name="users"/><b>没有匹配的学生账号</b><p>试试其他姓名或账号。</p>{search && <Button onClick={() => setSearch('')}>清除搜索</Button>}</div>}
    <Drawer rootClassName="staff-account-overlay" open={!!selected} onClose={()=>setSelectedId(null)} title="开店权限详情" className="admin-editor shop-permission-detail" placement="right" size="min(480px, 100vw)" footer={selected && <section className="shop-permission-control"><div><div><b>开店权限</b><p>{selected.shopManagement ? '已授权，可管理自己的店铺。' : '尚未授予开店权限。'}</p></div><Switch checked={selected.shopManagement===true} disabled={!selected.enabled&&!selected.shopManagement} aria-label={`开店权限 ${selected.id}`} onChange={()=>toggle(selected)}/></div>{!selected.enabled && !selected.shopManagement && <small>账号已停用，启用后可授予开店权限。</small>}</section>}>{selected && <><section className="shop-permission-identity"><span className="admin-avatar admin-avatar-student">{selected.name.slice(0,1)}</span><div><h2>{selected.name}</h2><p>{selected.id}</p></div><Tag color={selected.enabled ? 'green' : 'default'}>{selected.enabled ? '已启用' : '已停用'}</Tag></section><section className="shop-permission-description"><span><Icon name="bag"/></span><div><h3>学生店铺管理</h3><p>授权后，学生可在「我的」中进入「管理店铺」，创建并经营自己的小卖部。</p><p>收回权限后，店铺暂停接收新订单，店铺资料和已有订单会保留。</p></div></section></>}</Drawer>
  </section>
}
