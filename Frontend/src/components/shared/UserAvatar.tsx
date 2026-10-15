import { useContext } from 'react'
import type { ReactNode } from 'react'
import { useSocial } from '../../features/messages/socialContext'
import { IdentityContext } from '../../features/identity/IdentityContext'
export function UserAvatar({ name, userId, className = 'avatar', children, anonymous = false }: { name: string; userId?: string; className?: string; children?: ReactNode; anonymous?: boolean }) {
  const social = useSocial()
  const identity = useContext(IdentityContext)
  const profile = identity?.publicProfiles.find(item => userId ? item.userId === userId : item.nickname === name)
  const own = userId ? userId === identity?.self.userId : name === social.self || name === '我' || name === '我（演示）'
  const content = !anonymous && profile?.avatar ? <img className="public-user-avatar" src={profile.avatar} alt={`${profile.nickname}的头像`}/> : children || name.slice(0, 1)
  if (anonymous || own) return <span className={className} aria-label={own ? '我的头像' : '匿名用户头像'}>{content}</span>
  return <span role="button" tabIndex={0} className={className + ' user-avatar-button'} aria-label={`查看${name}的资料`} onClick={e => { e.stopPropagation(); social.open(name) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); social.open(name) } }}>{content}</span>
}

