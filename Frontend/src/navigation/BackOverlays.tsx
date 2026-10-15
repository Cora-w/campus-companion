import { Drawer as AntDrawer, Modal as AntModal } from 'antd'
import type { DrawerProps, ModalProps } from 'antd'
import { useBackNavigation } from './useBackNavigation'
const backIcon = <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>
export function Drawer(props:DrawerProps) {
  useBackNavigation(!!props.open && !!props.onClose, () => props.onClose?.(new Event('back') as unknown as Parameters<NonNullable<DrawerProps['onClose']>>[0]), props.zIndex ?? 1000)
  const closable = props.closable === false ? false : { ...(typeof props.closable === 'object' ? props.closable : {}), placement:'start' as const, 'aria-label':'返回上一页' }
  // Mobile pages replace the current surface; nested pages must not push their
  // parent sideways or upward and expose a displaced half-screen underneath.
  return <AntDrawer {...props} push={false} closable={closable} closeIcon={props.closeIcon ?? backIcon}/>
}
export function Modal(props:ModalProps) {
  useBackNavigation(!!props.open && !!props.onCancel, () => props.onCancel?.(new Event('back') as unknown as Parameters<NonNullable<ModalProps['onCancel']>>[0]), 3000)
  return <AntModal {...props} closeIcon={props.closeIcon ?? backIcon}/>
}
