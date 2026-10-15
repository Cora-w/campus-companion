import { useRef, useState } from 'react'
import type { SetStateAction } from 'react'
import type { DiscoverReview } from '../../data/discoverData'

export type DiscoverFeedback = { liked: string[]; reviews: DiscoverReview[] }
export function useDiscoverFeedback(account: string) {
  const key = 'campus-discover-feedback-v1:' + account
  const [feedback, updateFeedback] = useState<DiscoverFeedback>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null')
      if (data && Array.isArray(data.liked) && data.liked.every((id: unknown) => typeof id === 'string') && Array.isArray(data.reviews) && data.reviews.every((r: DiscoverReview) => r && typeof r.id === 'string' && typeof r.target === 'string' && typeof r.author === 'string' && typeof r.text === 'string' && typeof r.rating === 'number' && typeof r.likes === 'number' && typeof r.time === 'string')) return data
    } catch { /* Local feedback is optional. */ }
    return { liked: [], reviews: [] }
  })
  const [storageError, setStorageError] = useState(false)
  const latest = useRef(feedback)
  const setFeedback = (update: SetStateAction<DiscoverFeedback>) => {
    const next = typeof update === 'function' ? update(latest.current) : update
    latest.current = next
    updateFeedback(next)
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false) }
    catch { setStorageError(true) }
  }
  return { feedback, setFeedback, storageError }
}
