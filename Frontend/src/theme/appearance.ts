import { createContext, useContext } from 'react'

export const themes = [
  { id: 'warm', name: '暖陶橙', accent: '#b84020', soft: '#fff0e8', canvas: '#faf9f6', tint: '#f5e9db' },
  { id: 'green', name: '松林绿', accent: '#28704c', soft: '#eaf5ee', canvas: '#f7faf7', tint: '#e1efe5' },
  { id: 'blue', name: '晴空蓝', accent: '#2866a8', soft: '#eaf2fc', canvas: '#f7f9fc', tint: '#e1ebf8' },
  { id: 'purple', name: '鸢尾紫', accent: '#7550a4', soft: '#f2ecfa', canvas: '#faf8fc', tint: '#ece3f5' },
  { id: 'rose', name: '蔷薇粉', accent: '#a43d66', soft: '#fcecf2', canvas: '#fcf8fa', tint: '#f5e1ea' },
] as const
export type ThemeId = typeof themes[number]['id']
export const appearanceKey = 'campus-appearance-theme'
export function readTheme(): ThemeId {
  try { const value = localStorage.getItem(appearanceKey); return themes.find(theme => theme.id === value)?.id || 'warm' } catch { return 'warm' }
}
export const AppearanceContext = createContext<{ themeId: ThemeId; choose: (id: ThemeId) => void; saved: boolean }>({ themeId: 'warm', choose: () => {}, saved: true })
export const useAppearance = () => useContext(AppearanceContext)

