import type { Account, CareCase, Session } from '../../types/domain.ts'
export type SchoolDetails = { college: string; major: string; grade: string; className: string }
export type PublicProfile = { userId: string; schoolId: string; nickname: string; avatar: string }
export type PrivateIdentity = { userId: string; schoolId: string; realName: string; studentNumber: string; schoolDetails: SchoolDetails }
export function publicProfile(profile: PublicProfile): PublicProfile {
  return { userId: profile.userId, schoolId: profile.schoolId, nickname: profile.nickname, avatar: profile.avatar }
}
export function readStudentIdentity(session: Session | null, target: string, identities: PrivateIdentity[], accounts: Account[], cases: CareCase[]): PrivateIdentity | null {
  if (!session || session.role !== 'teacher' || !accounts.some(a => a.id === session.id && a.schoolId === session.schoolId && a.enabled && a.role === 'teacher')) return null
  const identity = identities.find(item => item.userId === target && item.schoolId === session.schoolId)
  if (!identity || !accounts.some(a => a.id === target && a.role === 'student' && a.enabled && a.schoolId === session.schoolId) || !cases.some(item => item.teacherId === session.id && item.schoolId === session.schoolId && item.studentAccountId === target)) return null
  return { ...identity, schoolDetails: { ...identity.schoolDetails } }
}
