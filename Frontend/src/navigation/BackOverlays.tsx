import { Drawer as AntDrawer, Modal as AntModal } from 'antd'
import type { DrawerProps, ModalProps } from 'antd'
import { useBackNavigation } from './useBackNavigation'
export function Drawer(props:DrawerProps) {
  useBackNavigation(!!props.open && !!props.onClose, () => props.onClose?.(new Event('back') as unknown as Parameters<NonNullable<DrawerProps['onClose']>>[0]), props.zIndex ?? 1000)
  return <AntDrawer {...props}/>
}
export function Modal(props:ModalProps) {
  useBackNavigation(!!props.open && !!props.onCancel, () => props.onCancel?.(new Event('back') as unknown as Parameters<NonNullable<ModalProps['onCancel']>>[0]), 3000)
  return <AntModal {...props}/>
}
