import { useMemo } from 'react'
import type { ThemeConfig } from 'antd'
import { themes, useAppearance } from './appearance'

type Palette = { accent:string; soft:string; canvas:string; tint:string }

// Staff workspaces adapt to the existing login/student palette, without changing it.
export function createProductCssProperties(palette:Palette) {
  return {
    '--brand-primary':palette.accent, '--brand-soft':palette.soft,
    '--brand-canvas':palette.canvas, '--brand-tint':palette.tint,
    '--brand-text':'#242321', '--brand-secondary':'#66635f',
    '--brand-border':'color-mix(in srgb, '+palette.tint+' 70%, #bfc4c9)',
  }
}

export function useProductTheme():ThemeConfig {
  const { themeId } = useAppearance()
  const palette = themes.find(theme => theme.id === themeId) || themes[0]
  return useMemo(() => ({
    token: {
      colorPrimary:palette.accent, colorInfo:palette.accent,
      colorText:'#242321', colorTextSecondary:'#66635f', colorTextPlaceholder:'#77716a',
      colorBorder:palette.tint, colorBgContainer:'#fff', colorBgLayout:palette.canvas,
      borderRadius:8, controlHeight:44, fontSize:14,
      fontFamily:'-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif',
    },
    components: {
      Button:{ primaryShadow:'none', defaultShadow:'none' },
      Input:{ activeBorderColor:palette.tint, hoverBorderColor:palette.tint },
      Select:{ optionSelectedBg:palette.soft, activeBorderColor:palette.tint },
    },
  }), [palette])
}
