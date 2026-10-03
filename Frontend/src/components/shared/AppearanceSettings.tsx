import { Button } from 'antd'
import { themes, useAppearance } from '../../theme/appearance'
import { Icon } from './Shared'

export function AppearanceSettings() {
  const { themeId, choose, saved } = useAppearance()
  return <section className="appearance-settings" aria-label="主题颜色">
    <div className="row"><h3>主题颜色</h3><span>{themes.find(theme => theme.id === themeId)?.name}</span></div>
    <p>挑一个喜欢的颜色，让校园空间更像你。</p>
    <div className="theme-options" role="group" aria-label="选择主题颜色">{themes.map(theme => <button key={theme.id} aria-label={theme.name} aria-pressed={themeId === theme.id} onClick={() => choose(theme.id)}><span style={{ background: theme.accent }}>{themeId === theme.id && <Icon name="check"/>}</span><small>{theme.name}</small></button>)}</div>
    <div className="theme-preview"><div><b>今天，也有新的小美好</b><small>按钮、选中状态和页面底色随主题变化</small></div><span>校园日常</span></div>
    <div className="appearance-caption"><small role="status">{saved ? '立即生效，自动记住此浏览器的选择' : '已生效，但浏览器未能保存；刷新后可能重置'}</small><Button type="text" size="small" disabled={themeId === 'warm'} onClick={() => choose('warm')}>恢复默认</Button></div>
  </section>
}

