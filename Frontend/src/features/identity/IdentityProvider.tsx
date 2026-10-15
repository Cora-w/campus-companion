import { useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { Account, CareCase, Session } from '../../types/domain'
import { apiConfig } from '../../config/env'
import { demoStudentIdentities } from '../../mocks/studentIdentities'
import { IdentityContext } from './IdentityContext'
import type { OwnProfile } from './IdentityContext'
import { publicProfile, readStudentIdentity } from './identityModel'
const blankDetails = { college: '', major: '', grade: '', className: '' }
export function IdentityProvider({ session, accounts, setAccounts, cases, children }: { session: Session | null; accounts: Account[]; setAccounts: Dispatch<SetStateAction<Account[]>>; cases: CareCase[]; children: ReactNode }) {
  const [identities, setIdentities] = useState(() => apiConfig.mode === 'mock' ? demoStudentIdentities : [])
  const [profiles, setProfiles] = useState<Record<string, Partial<OwnProfile>>>({})
  const latestProfiles = useRef(profiles)
  const own = identities.find(item => item.userId === session?.id && item.schoolId === session?.schoolId)
  const self: OwnProfile = { userId: session?.id || '', nickname: accounts.find(a => a.id === session?.id)?.name || session?.name || '', avatar: profiles[session?.id || '']?.avatar || session?.avatar || '', realName: own?.realName || '', studentNumber: session?.loginAccount || '', schoolDetails: session?.role === 'student' ? own?.schoolDetails || blankDetails : blankDetails }
  const saveSelf = (patch: Partial<OwnProfile>) => {
    if (!session || !accounts.some(a => a.id === session.id && a.schoolId === session.schoolId && a.role === session.role && a.enabled)) return
    const next = { ...latestProfiles.current, [session.id]: { ...latestProfiles.current[session.id], ...patch } }
    latestProfiles.current = next; setProfiles(next)
    if (patch.nickname?.trim()) setAccounts(previous => previous.map(a => a.id === session.id && a.schoolId === session.schoolId ? { ...a, name: patch.nickname!.trim() } : a))
    // A student cannot change their authenticated login number by editing a profile.
    if ('realName' in patch || patch.schoolDetails) setIdentities(previous => {
      const found = previous.find(item => item.userId === session.id)
      const updated = { userId: session.id, schoolId: session.schoolId, realName: patch.realName?.trim() ?? found?.realName ?? '', studentNumber: session.loginAccount || '', schoolDetails: session.role === 'student' ? patch.schoolDetails || found?.schoolDetails || blankDetails : blankDetails }
      return [...previous.filter(item => item.userId !== session.id), updated]
    })
  }
  const publicProfiles = accounts.filter(a => a.enabled && a.schoolId === session?.schoolId).map(a => publicProfile({ userId: a.id, schoolId: a.schoolId, nickname: a.name, avatar: profiles[a.id]?.avatar || '' }))
  return <IdentityContext.Provider value={{ self, saveSelf, publicProfiles, studentIdentity: id => readStudentIdentity(session, id, identities, accounts, cases) }}>{children}</IdentityContext.Provider>
}
