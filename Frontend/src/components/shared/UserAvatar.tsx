import type { ReactNode } from 'react'
import { useSocial } from '../../features/messages/socialContext'
export function UserAvatar({ name, className = 'avatar', children, anonymous = false }: { name: string; className?: string; children?: ReactNode; anonymous?: boolean }) {
  const social = useSocial()
  const own = name === social.self || name === '我' || name === '我（演示）'
  if (anonymous || own) return <span className={className} aria-label={own ? '我的头像' : '匿名用户头像'}>{children || name.slice(0, 1)}</span>
  return <span role="button" tabIndex={0} className={className + ' user-avatar-button'} aria-label={`查看${name}的资料`} onClick={e => { e.stopPropagation(); social.open(name) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); social.open(name) } }}>{children || name.slice(0, 1)}</span>
}

