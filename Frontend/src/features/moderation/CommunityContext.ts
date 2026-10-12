import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { CampusPost } from '../../data/campusData'
import type { PostDecision, PostReport } from './moderationModel'
export type CommunityOperations = { posts: CampusPost[]; setPosts: Dispatch<SetStateAction<CampusPost[]>>; reports: PostReport[]; decisions: PostDecision[]; deletedPosts: CampusPost[]; report: (postId: string, reason: string) => string; review: (postId: string, action: PostDecision['action'], reason: string) => string }
export const CommunityContext = createContext<CommunityOperations | null>(null)
export function useCommunity() { const value = useContext(CommunityContext); if (!value) throw new Error('Missing community provider'); return value }
