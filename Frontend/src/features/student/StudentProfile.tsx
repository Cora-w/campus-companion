import { CancelSnackOrder } from '../commerce/CancelSnackOrder'
import { snackPrice } from '../../data/snackData'
import { AppearanceSettings } from '../../components/shared/AppearanceSettings'
import { useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Switch, Tag, message } from 'antd'
import { useCommerce } from '../commerce/commerce'
import { Icon, Sheet } from '../../components/shared/Shared'
import './StudentProfile.css'

type Props = {
  avatar: string; realName: string; studentNumber: string
  saveIdentity: (avatar: string, realName: string, studentNumber: string) => void
  name: string; account: string; counts: number[]; hasDraft: boolean
  open: (panel: 'my-posts' | 'collection' | 'liked' | 'history' | 'identity' | 'privacy' | 'categories') => void
  rename: (name: string) => void; publish: () => void; shop: () => void
  logout: () => void; clearHistory: () => void
}
export function StudentProfile(props: Props) {
  const [messageApi, messageContext] = message.useMessage()
  const [discardOpen, setDiscardOpen] = useState(false)
  const [panel, setPanel] = useState<'edit' | 'orders' | 'settings' | 'help' | 'feedback' | null>(null)
  const [bio, setBio] = useState('把校园里的小美好，慢慢收集起来。')
  const [nameDraft, setNameDraft] = useState(props.name)
  const [bioDraft, setBioDraft] = useState(bio)
  const [color, setColor] = useState('#ead8c4')
  const [colorDraft, setColorDraft] = useState(color)
  const [avatarDraft, setAvatarDraft] = useState(props.avatar)
  const [realNameDraft, setRealNameDraft] = useState(props.realName)
  const [studentNumberDraft, setStudentNumberDraft] = useState(props.studentNumber)
  const [avatarError, setAvatarError] = useState('')
  const [readingAvatar, setReadingAvatar] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const avatarVersion = useRef(0)
  const importAvatar = async (file?: File) => {
    if (!file) return
    const version = ++avatarVersion.current
    setAvatarError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setReadingAvatar(false)
      setAvatarError('请选择 5MB 以内的 JPG、PNG 或 WebP 图片。'); return
    }
    setReadingAvatar(true)
    try {
      const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      const image = new Image(); image.src = url; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256
      const context = canvas.getContext('2d'); if (!context) throw new Error('无法处理图片')
      const side = Math.min(image.naturalWidth, image.naturalHeight)
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256)
      if (version === avatarVersion.current) setAvatarDraft(canvas.toDataURL('image/png'))
    } catch { if (version === avatarVersion.current) setAvatarError('图片无法读取，请换一张图片。') }
    finally { if (version === avatarVersion.current) setReadingAvatar(false) }
  }
  const closeEditor = () => { avatarVersion.current++; setReadingAvatar(false); setPanel(null) }
  const isDirty = nameDraft !== props.name || bioDraft !== bio || colorDraft !== color || avatarDraft !== props.avatar || realNameDraft !== props.realName || studentNumberDraft !== props.studentNumber
  const requestClose = () => { if (panel === 'feedback') { setPanel('help'); return } if (panel === 'edit' && (isDirty || readingAvatar)) setDiscardOpen(true); else closeEditor() }
  const [reminders, setReminders] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [feedbacks, setFeedbacks] = useState<string[]>([])
  const [filter, setFilter] = useState('全部')
  const [confirm, setConfirm] = useState<'logout' | 'history' | null>(null)
  const { orders, studentId } = useCommerce()
  const mine = orders.filter(order => order.studentId === studentId)
  const pending = mine.filter(order => !['已完成', '已取消'].includes(order.status))
  const filtered = mine.filter(order => filter === '全部' || (filter === '进行中' ? !['已完成', '已取消'].includes(order.status) : order.status === filter))
  const edit = () => { setNameDraft(props.name); setBioDraft(bio); setColorDraft(color); setAvatarDraft(props.avatar); setRealNameDraft(props.realName); setStudentNumberDraft(props.studentNumber); setAvatarError(''); setPanel('edit') }
  return <div className="student-profile">
    {messageContext}
    <section className="personal-card">
      <div className="personal-eyebrow"><span>MY CAMPUS / 我的校园</span><button aria-label="打开设置" onClick={() => setPanel('settings')}><Icon name="settings"/></button></div>
      <div className="personal-identity"><button className="personal-avatar" style={{ background: color }} aria-label="编辑个人资料" onClick={edit}>{props.avatar ? <img src={props.avatar} alt="我的头像"/> : props.name.slice(0, 1)}</button><div><h1>{props.name}</h1><span>青禾大学 <i/> 学生体验账号</span></div><button className="personal-edit" onClick={edit}>编辑资料</button></div>
      <p className="personal-bio">{bio || '还没有写简介，介绍一下自己吧。'}</p>
      <div className="personal-stats">{(['my-posts', 'collection', 'liked', 'history'] as const).map((key, i) => <button key={key} onClick={() => props.open(key)}><b>{props.counts[i]}</b><span>{['发布', '收藏', '赞过', '足迹'][i]}</span></button>)}</div>
    </section>
    <button className="profile-campus-pass" onClick={() => props.open('identity')}><span className="profile-icon"><Icon name="shield"/></span><span><b>我的校园身份</b><small>青禾大学 · 认证服务待接入</small></span><span className="profile-pass-label">查看 <Icon name="next"/></span></button>
    <button className="profile-draft-entry" aria-label="草稿箱" onClick={props.publish}><span className="profile-icon"><Icon name="edit"/></span><span><b>草稿箱</b><small>{props.hasDraft ? '1 篇待完成，继续编辑' : '暂时没有草稿'}</small></span><Icon name="next"/></button>
    <section className="profile-section profile-orders-only"><button className="profile-order-entry" onClick={() => { setFilter('全部'); setPanel('orders') }}><span className="profile-icon"><Icon name="bag"/></span><span><b>我的零食订单</b><small>{pending.length ? `${pending.length} 笔订单进行中` : '查看订单和配送进度'}</small></span><span>{mine.length ? `${mine.length} 笔` : '全部'} <Icon name="next"/></span></button></section>
    <section className="profile-section profile-menu">{([{ icon: 'shield', label: '隐私与数据', hint: '', action: () => props.open('privacy') }, { icon: 'help', label: '帮助与反馈', hint: '', action: () => setPanel('help') }]).map(row => <button key={row.label} onClick={row.action}><Icon name={row.icon}/><b>{row.label}</b><small>{row.hint}</small><Icon name="next"/></button>)}</section>
    <p className="profile-footnote">心伙伴 · 让校园生活多一点陪伴<br/><span>体验版 · 个人记录刷新后重置，主题偏好保留</span></p>
    <Sheet fullScreen={panel === 'edit'} footer={panel === 'edit' ? <div className="profile-save-bar"><span>{readingAvatar ? '正在处理头像…' : isDirty ? '有修改尚未保存' : '资料已是最新'}</span><Button type="primary" htmlType="submit" form="profile-edit-form" disabled={!nameDraft.trim() || readingAvatar || !isDirty}>保存资料</Button></div> : undefined} open={panel !== null} onClose={requestClose} title={panel === 'edit' ? '编辑个人资料' : panel === 'orders' ? '我的零食订单' : panel === 'settings' ? '通用设置' : panel === 'feedback' ? '意见反馈' : '帮助与反馈'}>
      {panel === 'edit' && <form id="profile-edit-form" className="profile-editor profile-editor-page" onSubmit={e => { e.preventDefault(); if (!nameDraft.trim() || readingAvatar || !isDirty) return; props.rename(nameDraft.trim()); props.saveIdentity(avatarDraft, realNameDraft.trim(), studentNumberDraft.trim()); setBio(bioDraft.trim()); setColor(colorDraft); closeEditor(); void messageApi.success('个人资料已保存') }}>
        <div className="profile-editor-intro"><span>关于我</span><h2>让同学更好地认识你</h2><p>从一张头像、一句介绍开始。</p></div><div className="profile-avatar-upload"><button type="button" className="personal-avatar profile-avatar-preview" style={{ background: colorDraft }} aria-label="选择头像图片" disabled={readingAvatar} onClick={() => avatarInput.current?.click()}>{avatarDraft ? <img src={avatarDraft} alt="头像预览"/> : nameDraft.trim().slice(0, 1) || '我'}<span className="profile-avatar-badge"><Icon name="edit"/></span></button><input ref={avatarInput} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="上传头像文件" onChange={e => { void importAvatar(e.target.files?.[0]); e.target.value = '' }}/><Button type="link" loading={readingAvatar} onClick={() => avatarInput.current?.click()}>{avatarDraft ? '更换头像' : '上传自己的头像'}</Button>{avatarDraft && <Button type="text" disabled={readingAvatar} onClick={() => setAvatarDraft('')}>恢复文字头像</Button>}<small>JPG / PNG / WebP，最多 5MB · 居中裁成方形</small>{avatarError && <p className="error-text" role="alert">{avatarError}</p>}</div>
        {!avatarDraft && <div className="profile-colors" aria-label="文字头像底色">{['#ead8c4', '#d9e5d8', '#dae2ef', '#f0d6d0'].map(value => <button key={value} type="button" style={{ background: value }} aria-label={'头像底色 ' + value} aria-pressed={value === colorDraft} onClick={() => setColorDraft(value)}>{value === colorDraft && <Icon name="check"/>}</button>)}</div>}
        <section className="profile-form-group"><div className="profile-group-heading"><h3>公开资料</h3><span>同学可见</span></div><p>展示在个人主页和校园分享中</p><label>网名<Input aria-label="网名" placeholder="取一个喜欢的名字" status={!nameDraft.trim() ? 'error' : undefined} value={nameDraft} maxLength={16} showCount onChange={e => setNameDraft(e.target.value)}/></label>{!nameDraft.trim() && <small className="error-text" role="alert">网名不能为空，请填写后保存。</small>}<label>个人简介<Input.TextArea aria-label="个人简介" placeholder="分享你的兴趣，或最近的小小心情" value={bioDraft} maxLength={80} rows={3} showCount onChange={e => setBioDraft(e.target.value)}/></label></section>
        <section className="profile-form-group"><div className="profile-group-heading"><h3>校园身份</h3><span><Icon name="shield"/>仅自己可见</span></div><div className="profile-school-row"><span className="profile-icon"><Icon name="guide"/></span><div><b>青禾大学</b><small>我的校园</small></div><Tag>未认证</Tag></div><label>真实姓名<Input aria-label="真实姓名" placeholder="填写真实姓名" value={realNameDraft} maxLength={40} onChange={e => setRealNameDraft(e.target.value)}/></label><label>学号<Input aria-label="学号" placeholder="填写学校分配的学号" value={studentNumberDraft} maxLength={32} onChange={e => setStudentNumberDraft(e.target.value)}/></label><small>青禾大学 · 当前仅保存本次填写信息，不代表通过学校认证。</small></section>
        <p className="profile-editor-note"><Icon name="shield"/>真实姓名和学号不会显示在公开动态中。<br/>体验版资料仅保留至刷新或退出。</p></form>}
      {panel === 'orders' && <><div className="profile-order-tabs">{['全部', '进行中', '已完成', '已取消'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>{filtered.length ? filtered.map(order => <article className="profile-order-card" key={order.id}><div className="row"><b>{order.shop}</b><Tag>{order.status}</Tag></div><small>订单号 {order.id}</small>{order.items.map((item, i) => <p key={i}>{item.name} × {item.count}<span>¥{snackPrice(item.price * item.count)}</span></p>)}<p>{order.mode}<span>合计 ¥{snackPrice(order.total)}</span></p><small>演示订单，未实际付款或配送</small><CancelSnackOrder order={order}/></article>) : <div className="profile-empty"><Icon name="bag"/><h3>{filter === '全部' ? '还没有零食订单' : `暂无${filter}订单`}</h3><p>课间的小满足，从逛逛校园小店开始。</p><Button onClick={() => { setPanel(null); props.shop() }}>去逛零食铺子</Button></div>}</>}
      {panel === 'settings' && <div className="profile-settings"><AppearanceSettings/><div className="row"><div><h3>互动提醒</h3><p>仅本次体验偏好，不发送系统通知</p></div><Switch aria-label="互动提醒" checked={reminders} onChange={setReminders}/></div><button onClick={() => setConfirm('history')}><span>清空浏览足迹</span><small>{props.counts[3]} 条</small><Icon name="next"/></button><button onClick={() => props.open('identity')}><span>账号与校园身份</span><Icon name="next"/></button><p className="subtle">当前账号：{props.account}</p><Button block danger onClick={() => setConfirm('logout')}>退出当前身份</Button><p className="demo-note">退出会清空本次个人资料、发布、收藏和对话。</p></div>}
      {panel === 'help' && <div className="profile-help"><h3>常见问题</h3>{[['发布的内容在哪里查看？', '在“我的发布”中查看本次校园墙分享；尚未发布的内容可以从草稿箱继续编辑。'], ['收藏和点赞有什么区别？', '收藏便于再次找到帖子与地点；赞过用于回看你点赞的校园墙动态。'], ['为什么刷新后记录不见了？', '目前为前端体验版，个人资料、动态和订单等仅保留在本次体验中。首页分类偏好会保存在当前浏览器。'], ['如何联系心理支持？', '进入“首页 → 倾诉空间”查看支持入口。当前体验不代表真实预约或即时响应。']].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}<Button block type="primary" className="spaced" onClick={() => setPanel('feedback')}>提出建议或反馈问题</Button><p className="demo-note">心伙伴 · 校园生活体验版</p></div>}
      {panel === 'feedback' && <form className="profile-editor" onSubmit={e => { e.preventDefault(); if (feedback.trim().length < 5) return; setFeedbacks(prev => [feedback.trim(), ...prev]); setFeedback('') }}><label>想让哪里变得更好？<Input.TextArea placeholder="描述遇到的问题，或者你期待的新功能（至少 5 个字）" rows={5} maxLength={500} showCount value={feedback} onChange={e => setFeedback(e.target.value)}/></label><Button block type="primary" htmlType="submit" disabled={feedback.trim().length < 5}>保存本次反馈</Button><p className="demo-note">仅保留在本次体验中，尚未发送给客服。</p>{feedbacks.length > 0 && <><Alert type="success" title="反馈已保存在本次体验中"/><h3 className="spaced">我的反馈</h3>{feedbacks.map((item, i) => <p className="profile-feedback-item" key={i}>{item}<small>本次记录 · 未发送</small></p>)}</>}</form>}
    </Sheet>
    <Modal open={discardOpen} title="放弃这次修改？" okText="放弃修改" cancelText="继续编辑" onCancel={() => setDiscardOpen(false)} onOk={() => { setDiscardOpen(false); closeEditor() }}><p>尚未保存的资料会丢失，已保存的资料不受影响。</p></Modal>
    <Modal open={confirm !== null} title={confirm === 'logout' ? '退出当前身份？' : '清空浏览足迹？'} okText={confirm === 'logout' ? '确认退出' : '确认清空'} cancelText="取消" onCancel={() => setConfirm(null)} onOk={() => { if (confirm === 'logout') props.logout(); else props.clearHistory(); setConfirm(null) }}><p>{confirm === 'logout' ? '本次个人资料、发布、收藏、草稿和对话将被清空。' : '清空后无法恢复，已发布和已收藏的内容不受影响。'}</p></Modal>
  </div>
}

