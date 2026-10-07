import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Input, Modal } from 'antd'
import type { Session } from '../../types/domain'
import type { School } from '../../types/school'
import { schoolService } from '../../services/schools'
import { useBackNavigation } from '../../navigation/useBackNavigation'
import './SchoolGate.css'

export function SchoolGate({ session, logout, children }: { session: Session; logout: () => Promise<void>; children: ReactNode }) {
  const [school, setSchool] = useState<School | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let active = true
    schoolService.current(session.id).then(async bound => {
      if (!active) return
      if (bound) { setSchool(bound); return }
      const items = await schoolService.list()
      if (active) setSchools(items)
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : '暂时无法加载学校，请重试。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session.id, attempt])
  const exit = async () => {
    if (busy.current) return
    busy.current = true; setLeaving(true)
    try { await logout() } finally { busy.current = false; if (alive.current) setLeaving(false) }
  }
  useBackNavigation(!school, () => { void exit() }, 3000)
  const bind = async () => {
    if (!selected || busy.current || loading) return
    busy.current = true; setSaving(true); setError('')
    try {
      const result = await schoolService.bind(session.id, selected)
      if (alive.current) setSchool(result)
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : '绑定失败，请重试。') }
    finally { busy.current = false; if (alive.current) setSaving(false) }
  }
  if (school) return <><div className="bound-school" aria-label="当前学校">{school.name}<span>我的学校</span></div>{children}</>
  const visible = schools.filter(item => `${item.name}${item.city}`.includes(query.trim()))
  return <div className="school-gate-background">
    <Modal open title="先找到你的学校" closable={false} maskClosable={false} keyboard={false} centered footer={null} width={380} className="school-picker">
      <p className="school-intro">绑定学校后，才能进入你的校园空间。</p>
      <Input aria-label="搜索学校" placeholder="搜索学校名称" value={query} disabled={loading || saving || leaving} onChange={event => setQuery(event.target.value)}/>
      <div className="school-options" role="radiogroup" aria-label="选择学校" aria-busy={loading}>
        {loading ? <p role="status">正在确认学校信息…</p> : visible.map(item => <label key={item.id} className={selected === item.id ? 'selected' : ''}>
          <input type="radio" name="school" value={item.id} checked={selected === item.id} disabled={saving || leaving} onChange={() => setSelected(item.id)}/>
          <span><b>{item.name}</b><small>{item.city}</small></span>
        </label>)}
        {!loading && !visible.length && !error && <p>未找到学校，请调整搜索或联系管理员开通。</p>}
      </div>
      {error && <div className="school-error" role="alert">{error}<Button type="link" disabled={saving || leaving} onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>重新加载</Button></div>}
      <p className="school-binding-note">请确认选择。绑定后不能自行切换学校。</p>
      <Button type="primary" block disabled={!selected || loading || leaving} loading={saving} onClick={() => { void bind() }}>确认学校，进入校园</Button>
      <Button block type="text" className="school-exit" disabled={saving} loading={leaving} onClick={() => { void exit() }}>暂不选择，退出登录</Button>
    </Modal>
  </div>
}
