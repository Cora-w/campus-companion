import { createContext, useContext } from 'react'
import type { PrivateIdentity, PublicProfile, SchoolDetails } from './identityModel'
export type OwnProfile = { userId: string; nickname: string; avatar: string; realName: string; studentNumber: string; schoolDetails: SchoolDetails }
export type IdentityOperations = { self: OwnProfile; publicProfiles: PublicProfile[]; saveSelf: (patch: Partial<OwnProfile>) => void; studentIdentity: (userId: string) => PrivateIdentity | null }
export const IdentityContext = createContext<IdentityOperations | null>(null)
export function useIdentity() { const value = useContext(IdentityContext); if (!value) throw Error('Missing identity provider'); return value }
