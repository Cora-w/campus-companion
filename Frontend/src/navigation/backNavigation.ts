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
function cancelConfirmation() {
  const modal = [...document.querySelectorAll('.ant-modal-confirm')].find(item => item.getClientRects().length)
  const cancel = modal?.querySelector<HTMLButtonElement>('.ant-modal-confirm-btns button:not(.ant-btn-primary)')
  if (!cancel || cancel.disabled) return false
  cancel.click()
  return true
}
// Android asks the same layer stack used by browser back, without racing WebView history.
declare global { interface Window { campusBack?: () => boolean } }
window.campusBack = () => {
  if (cancelConfirmation()) return true
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
  if (!cancelConfirmation()) top.back()
  reconcile()
})
export function registerBack(back:()=>void, priority:number) {
  const id = Symbol('back-layer')
  entries.set(id,{back,priority,order:++order}); reconcile()
  return () => { entries.delete(id); reconcile() }
}

// A single edge gesture uses the same stack as arrows and the system Back button.
let gesture: { x:number; y:number; time:number; entry:Entry } | null = null
window.addEventListener('touchstart', event => {
  gesture = null
  const top = topEntry()
  if (!top || event.touches.length !== 1) return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('input,textarea,select,[role="slider"],.slick-slider,.ant-select-dropdown,[data-disable-back-gesture]')) return
  // Confirmation dialogs must resolve before their underlying page can leave.
  if ([...document.querySelectorAll('.ant-modal-confirm')].some(modal => modal.getClientRects().length)) return
  const touch = event.touches[0]
  const surface = target?.closest('.ant-modal,.ant-image-preview,.ant-drawer-content,.app-shell,.teacher-shell-host,.admin-shell-host')
  const left = surface?.getBoundingClientRect().left ?? 0
  if (touch.clientX - left < 0 || touch.clientX - left > 28) return
  gesture = { x:touch.clientX, y:touch.clientY, time:Date.now(), entry:top }
}, { passive:true })
window.addEventListener('touchmove', event => {
  if (!gesture || event.touches.length !== 1) { gesture = null; return }
  const touch = event.touches[0], dx = touch.clientX - gesture.x, dy = touch.clientY - gesture.y
  if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return }
  if (dx > 16 && dx > Math.abs(dy) * 1.5 && event.cancelable) event.preventDefault()
}, { passive:false })
window.addEventListener('touchend', event => {
  const start = gesture; gesture = null
  if (!start || event.changedTouches.length !== 1 || topEntry() !== start.entry) return
  const touch = event.changedTouches[0], dx = touch.clientX - start.x, dy = Math.abs(touch.clientY - start.y)
  if (dx >= 72 && dx > dy * 1.8 && Date.now() - start.time < 1000) start.entry.back()
}, { passive:true })
window.addEventListener('touchcancel', () => { gesture = null }, { passive:true })
