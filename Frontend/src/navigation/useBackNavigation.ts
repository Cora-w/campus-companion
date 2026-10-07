import { useLayoutEffect, useRef } from 'react'
import { registerBack } from './backNavigation'
export function useBackNavigation(active:boolean, back:()=>void, priority=1000) {
  const latest = useRef(back)
  useLayoutEffect(() => { latest.current = back })
  useLayoutEffect(() => {
    if (active) return registerBack(() => latest.current(),priority)
  },[active,priority])
}
