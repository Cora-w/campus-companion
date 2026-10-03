import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { Discover } from '../src/features/discover/Discover'
import { Icon, Sheet } from '../src/components/shared/Shared'
import type { CampusPlace } from '../src/data/campusData'
import '../src/index.css'
import '../src/App.css'
import '../src/features/student/StudentRefinements.css'
export default function Preview() {
  const [selectedId, select] = useState<string|null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [place, setPlace] = useState<CampusPlace|null>(null)
  return <ConfigProvider theme={{token:{colorPrimary:'#b84020',borderRadius:12,fontFamily:'inherit'}}}><div className="app-shell"><header className="mobile-header"><div className="header-title"><h1>校园发现</h1></div><Icon name="bell"/></header><div className="main-shell"><main><Discover active selectedId={selectedId} select={select} account="layout-preview" name="布局检查" saved={saved} toggleSave={id => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev,id])} openPlace={setPlace}/></main></div><nav className="bottom-nav" style={{gridTemplateColumns:'repeat(5,1fr)'}}>{['首页','发现','发布','消息','我的'].map((label,i) => <button key={label} className={i === 1 ? 'selected' : ''}><span className="tab-icon"><Icon name={['home','location','plus','chat','profile'][i]}/></span><span>{label}</span></button>)}</nav><Sheet title="地点详情" open={!!place} onClose={() => setPlace(null)}><h2>{place?.name}</h2><p>{place?.location}</p></Sheet></div></ConfigProvider>
}
createRoot(document.getElementById('root')!).render(<Preview/> )
