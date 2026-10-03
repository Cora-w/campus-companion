import { PhotoAlbum } from '../../components/shared/PhotoAlbum'
import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Button, Input, Select, Switch } from 'antd'
import { Icon, Sheet } from '../../components/shared/Shared'
import './PublishComposer.css'
import { PublishLocation } from './PublishLocation'
import { visibilityLabel, visibilityOptions } from './postVisibility'
import type { PostVisibility } from './postVisibility'

type Props = {
  visibility: PostVisibility; setVisibility: (value: PostVisibility) => void
  placeLink?: ReactNode
  title: string; text: string; category: string; location: string; anonymous: boolean
  images: string[]; uploading: boolean; error: string; categories: string[]; name: string
  fileInput: RefObject<HTMLInputElement | null>
  setTitle: (value: string) => void; setText: (value: string) => void
  setCategory: (value: string) => void; setLocation: (value: string) => void
  setAnonymous: (value: boolean) => void; setImages: (value: string[]) => void
  addImages: (files: FileList | null) => Promise<void>; publish: () => void; leave: () => void
}
const topics = ['校园日常', '今天吃什么', '校园随手拍', '自习打卡', '我的课余生活', '周末去哪儿']

export function PublishComposer({ fileInput, ...p }: Props) {
  const [preview, setPreview] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [topicOpen, setTopicOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [topicError, setTopicError] = useState('')
  const ready = !!(p.title.trim() && p.text.trim()) && !p.uploading
  const hasDraft = !!(p.title.trim() || p.text.trim() || p.images.length || p.location || p.anonymous || p.visibility !== 'campus')
  const addTopic = (value: string) => {
    const clean = value.replace(/[#\s]/g, '').slice(0, 20)
    if (!clean) return
    if (p.text.split(/\s+/).includes('#' + clean)) { setTopicError('这个话题已经添加了'); return }
    const next = p.text + (p.text && !/\s$/.test(p.text) ? '\n' : '') + '#' + clean + ' '
    if (next.length > 1500) { setTopicError('正文空间不足，请精简后再添加话题'); return }
    p.setText(next); setTopic(''); setTopicError(''); setTopicOpen(false)
  }
  return <section className="publish-page-enter publish-studio" aria-label="发布日常">
    <form onSubmit={e => { e.preventDefault(); if (!p.uploading) p.publish() }}>
      <div className="compose-fields">
      <section className="compose-card compose-media" aria-label="图片与封面">
        <div className="compose-section-title"><b>添加照片 <span>可选</span></b><small>{p.images.length} / 6</small></div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={p.uploading} aria-label="添加分享图片" onChange={e => void p.addImages(e.target.files)}/>
        {p.images.length === 0 ? <button type="button" className="compose-upload-empty" disabled={p.uploading} onClick={() => fileInput.current?.click()}><span className="compose-upload-icon"><Icon name="plus"/></span><b>{p.uploading ? '正在读取照片…' : '添加照片'}</b><span>最多 6 张 · 也可以只写文字</span></button> : <div className="compose-photo-grid">{p.images.map((src, i) => <div className="compose-photo" key={src.slice(-24) + i}><img src={src} alt={`待发布图片 ${i + 1}`}/><button className="compose-remove" type="button" aria-label={`移除图片${i + 1}`} disabled={p.uploading} onClick={() => p.setImages(p.images.filter((_, index) => index !== i))}>×</button><button type="button" className={'compose-cover ' + (i === 0 ? 'is-cover' : '')} disabled={p.uploading || i === 0} onClick={() => p.setImages([src, ...p.images.filter((_, index) => index !== i)])}>{i === 0 ? '封面' : '设为封面'}</button></div>)}{p.images.length < 6 && <button type="button" className="compose-add" disabled={p.uploading} onClick={() => fileInput.current?.click()}><Icon name="plus"/><span>{p.uploading ? '读取中…' : '添加照片'}</span></button>}</div>}
        <p className="compose-caption">JPG / PNG / WebP · 每张不超过 5MB{p.images.length > 0 && ' · 首张为封面'}</p>
      </section>
      <section className="compose-card compose-writing" aria-label="编辑内容">
        <div className="compose-title-input"><Input id="post-title" aria-label="分享标题" variant="borderless" placeholder="写个标题，让同学一眼心动" maxLength={50} value={p.title} onChange={e => p.setTitle(e.target.value)}/><small>{p.title.length}/50</small></div>
        <Input.TextArea id="post-text" aria-label="分享内容" variant="borderless" placeholder={'分享你的发现、经历或心情…\n哪家食堂值得去？今天遇到了什么小美好？'} rows={3} maxLength={1500} value={p.text} onChange={e => p.setText(e.target.value)}/>
        <div className="compose-writing-tools"><button type="button" aria-label="添加话题" onClick={() => { setTopicError(''); setTopicOpen(true) }}><span>#</span> 添加话题</button><small>{p.text.length}/1500</small></div>
        <div className="compose-topic-suggestions">{topics.slice(0, 3).map(t => <button type="button" key={t} onClick={() => addTopic(t)}># {t}</button>)}</div>
        {!topicOpen && topicError && <p className="error-text" role="alert">{topicError}</p>}
      </section>
      <section className="compose-card compose-settings" aria-label="发布设置">
        {p.placeLink && p.visibility === 'campus' && <details className="compose-place-link"><summary><span><Icon name="location"/>分享到发现地点</span><Icon name="next"/></summary>{p.placeLink}</details>}
        <div className="compose-setting"><label htmlFor="compose-category"><Icon name="categories"/>选择分类</label><Select id="compose-category" aria-label="动态分类" variant="borderless" value={p.category} onChange={p.setCategory} options={p.categories.map(value => ({ value, label: value }))}/></div>
        <button type="button" className="compose-setting compose-location-row" aria-label="所在位置" onClick={() => setLocationOpen(true)}><span><Icon name="location"/>所在位置</span><span className="compose-location-value">{p.location || '定位 / 选择附近地点'}<Icon name="next"/></span></button>
        <button type="button" className="compose-setting compose-visibility-row" aria-label="谁可以看" aria-haspopup="dialog" onClick={() => setVisibilityOpen(true)}><span><Icon name="users"/>谁可以看</span><span className="compose-location-value">{visibilityLabel(p.visibility)}<Icon name="next"/></span></button>
        <div className="compose-setting"><label htmlFor="compose-anonymous"><Icon name="profile"/>匿名展示昵称</label><Switch id="compose-anonymous" aria-label="匿名展示昵称" checked={p.anonymous} onChange={p.setAnonymous}/></div>
        {p.anonymous && <p className="compose-caption">显示为“匿名同学” · {visibilityLabel(p.visibility)}</p>}
      </section>
      {p.error && <p role="alert" className="error-text">{p.error}</p>}
      </div>
      <div className="compose-publish-bar"><div><Button disabled={!hasDraft || p.uploading} onClick={p.leave}>存草稿</Button><Button disabled={!ready} onClick={() => setPreview(true)}>预览</Button><Button type="primary" htmlType="submit" loading={p.uploading} disabled={!ready}>{p.visibility === 'private' ? '发布为私密记录' : p.visibility === 'friends' ? '发布给好友' : '发布到校园墙'} <Icon name="next"/></Button></div></div>

    </form>
    <Sheet title="谁可以看" open={visibilityOpen} onClose={() => setVisibilityOpen(false)}><div className="compose-visibility-options" role="radiogroup" aria-label="发布可见范围">{visibilityOptions.map(option => <button type="button" role="radio" aria-checked={p.visibility === option.value} aria-label={option.label} key={option.value} onClick={() => { p.setVisibility(option.value); setVisibilityOpen(false) }}><span className="visibility-option-icon"><Icon name={option.icon}/></span><span><b>{option.label}</b><small>{option.description}</small></span><span className="visibility-radio">{p.visibility === option.value && <Icon name="check"/>}</span></button>)}</div><p className="visibility-demo-note">当前为本机体验，范围设置随内容保留；真实好友访问权限需接入账号服务。</p></Sheet>
    <Sheet title="所在位置" open={locationOpen} onClose={() => setLocationOpen(false)}>{locationOpen && <PublishLocation value={p.location} save={value => { p.setLocation(value); setLocationOpen(false) }}/>}</Sheet>
    <Sheet title="添加话题" open={topicOpen} onClose={() => setTopicOpen(false)}><div className="compose-topic-search"><Input aria-label="自定义话题" placeholder="搜索或创建话题" prefix="#" maxLength={20} value={topic} onChange={e => { setTopic(e.target.value); setTopicError('') }} onPressEnter={() => addTopic(topic)}/><Button type="primary" disabled={!topic.replace(/[#\s]/g, '')} onClick={() => addTopic(topic)}>添加</Button></div><p className="subtle">校园灵感</p><div className="compose-topic-list">{topics.filter(t => t.includes(topic.replace(/[#\s]/g, ''))).map(t => <button type="button" key={t} onClick={() => addTopic(t)}><span>#</span>{t}<Icon name="plus"/></button>)}</div>{topicError && <p role="alert" className="error-text">{topicError}</p>}</Sheet>
    <Sheet title="发布预览" open={preview} onClose={() => setPreview(false)}><article className="compose-preview"><div className="compose-preview-author"><span>{p.anonymous ? '匿' : p.name.slice(0, 1)}</span><div><b>{p.anonymous ? '匿名同学' : p.name}</b><small>{visibilityLabel(p.visibility)} · {p.category}</small></div></div>{p.images.length > 0 && <PhotoAlbum images={p.images} label="发布预览图片"/>}<h2>{p.title}</h2><p>{p.text}</p>{p.location && <p className="compose-preview-location"><Icon name="location"/>{p.location}</p>}<Button block type="primary" onClick={() => { setPreview(false); p.publish() }}>确认发布</Button><Button block type="text" onClick={() => setPreview(false)}>继续编辑</Button></article></Sheet>
  </section>
}

