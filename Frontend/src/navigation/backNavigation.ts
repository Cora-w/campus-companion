type Entry = { back:()=>void; priority:number; order:number }
const entries = new Map<symbol,Entry>()
let order = 0
const marker = '__campusBack'
const token = Math.random().toString(36).slice(2)
let removing = false
let scheduled = false
const isGuard = () => history.state?.[marker] === token
const stateWithoutMarker = () => { const state = {...history.state}; delete state[marker]; return state }
function topEntry() {
  return [...entries.values()].sort((a,b) => b.priority-a.priority || b.order-a.order)[0]
}
// Android asks the same layer stack used by browser back, without racing WebView history.
declare global { interface Window { campusBack?: () => boolean } }
window.campusBack = () => {
  const top = topEntry()
  if (!top) return false
  top.back()
  return true
}
// A reload starts a new in-memory session; do not keep an obsolete guard.
if (history.state?.[marker]) history.replaceState(stateWithoutMarker(),'')
function arm() {
  if (!isGuard()) history.pushState({...history.state,[marker]:token},'')
}
function reconcile() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    if (removing) return
    if (entries.size) arm()
    else if (isGuard()) { removing = true; history.back() }
  })
}
window.addEventListener('popstate', () => {
  if (removing) { removing = false; reconcile(); return }
  if (isGuard()) { reconcile(); return }
  const top = topEntry()
  if (!top) return
  // Keep the document active while the existing close/back handler resolves the next view.
  arm()
  top.back()
  reconcile()
})
export function registerBack(back:()=>void, priority:number) {
  const id = Symbol('back-layer')
  entries.set(id,{back,priority,order:++order}); reconcile()
  return () => { entries.delete(id); reconcile() }
}
