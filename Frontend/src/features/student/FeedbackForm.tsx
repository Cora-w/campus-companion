import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Image, Input } from 'antd'
import './FeedbackForm.css'

export type FeedbackRecord = { text: string; images: string[]; status?: string; reply?: string; time?: string; example?: boolean }
type Props = {
  text: string
  setText: (text: string) => void
  images: string[]
  setImages: (images: string[]) => void
  records: FeedbackRecord[]
  save: (record: FeedbackRecord) => void
}

const readImage = async (file: File) => {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取失败'))
    reader.onabort = () => reject(new Error('读取取消'))
    reader.readAsDataURL(file)
  })
  const image = new window.Image()
  image.src = url
  await image.decode()
  return url
}

export function FeedbackForm({ text, setText, images, setImages, records, save }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const busy = useRef(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const addImages = async (files: File[]) => {
    if (!files.length || busy.current) return
    setError('')
    if (images.length + files.length > 3) { setError('最多添加 3 张图片，请减少选择数量。'); return }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError('请选择每张不超过 5MB 的 JPG、PNG 或 WebP 图片。'); return
    }
    busy.current = true
    setReading(true)
    try {
      const urls = await Promise.all(files.map(readImage))
      if (mounted.current) setImages([...images, ...urls])
    } catch {
      if (mounted.current) setError('有图片无法读取，请重新选择。')
    } finally {
      busy.current = false
      if (mounted.current) setReading(false)
    }
  }
  const canSave = !reading && (text.trim().length >= 5 || images.length > 0)
  return <form className="profile-editor feedback-form" onSubmit={event => {
    event.preventDefault()
    if (!canSave || busy.current) return
    save({ text: text.trim(), images: [...images] })
    setError('')
  }}>
    <label>想让哪里变得更好？<Input.TextArea aria-label="反馈内容" placeholder="描述遇到的问题或期待的新功能，也可以附上截图" rows={5} maxLength={500} showCount value={text} onChange={event => setText(event.target.value)}/></label>
    <section className="feedback-attachments" aria-labelledby="feedback-images-title">
      <div className="feedback-attachments-heading"><b id="feedback-images-title">添加图片（选填）</b><span>{images.length} / 3</span></div>
      <p>截图或照片能帮我们更好地理解问题</p>
      <div className="feedback-image-grid">
        <Image.PreviewGroup preview={{ zIndex: 4000 }}>
          {images.map((src, index) => <div className="feedback-image" key={`${index}-${src.slice(-32)}`}>
            <Image src={src} alt={`反馈图片 ${index + 1}`} width="100%" height="100%"/>
            <button type="button" className="feedback-image-remove" aria-label={`删除反馈图片 ${index + 1}`} disabled={reading} onClick={() => { setImages(images.filter((_, i) => i !== index)); setError('') }}>×</button>
          </div>)}
        </Image.PreviewGroup>
        {images.length < 3 && <button type="button" className="feedback-image-add" disabled={reading} onClick={() => input.current?.click()} aria-label="添加反馈图片"><span aria-hidden="true">＋</span>{reading ? '读取中…' : '添加图片'}</button>}
      </div>
      <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" aria-label="上传反馈图片" disabled={reading} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void addImages(files) }}/>
      <small>最多 3 张，每张不超过 5MB · JPG / PNG / WebP</small>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
    <p className="feedback-form-hint">可直接附图反馈；未附图时，请至少填写 5 个字。</p>
    <Button block type="primary" htmlType="submit" disabled={!canSave} loading={reading}>提交反馈</Button>
    <p className="demo-note">反馈提交到本次演示的管理员端，可在下方查看处理状态和回复。</p>
    {records.length > 0 && <><Alert type="success" title={records.some(record=>!record.example)?'反馈已提交':'反馈流程示例'}/><h3>我的反馈</h3>{records.map((record, index) => <article className="profile-feedback-item" key={index}>
      {record.example && <small>演示示例</small>}{record.text && <p>{record.text}</p>}
      {record.images.length > 0 && <div className="feedback-image-grid"><Image.PreviewGroup preview={{ zIndex: 4000 }}>{record.images.map((src, i) => <div className="feedback-image" key={i}><Image src={src} alt={`已保存反馈图片 ${i + 1}`} width="100%" height="100%"/></div>)}</Image.PreviewGroup></div>}
      <small>{record.time} · {record.status || '待处理'}</small>{record.reply && <div className="feedback-admin-reply"><b>管理员回复</b><p>{record.reply}</p></div>}
    </article>)}</>}
  </form>
}
