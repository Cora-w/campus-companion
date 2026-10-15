// Keep the page on the layout viewport; only overlays follow the keyboard.
import { createOverlayViewportTracking, keepEditorVisible } from './overlayViewport.ts'
import { installPageGestureGuard } from './pageGestures'

export function installViewportTracking() {
  const disposePageGestures = installPageGestureGuard()
  const root = document.documentElement
  const viewport = window.visualViewport
  let frame = 0
  let restingHeight = root.clientHeight || window.innerHeight
  let restingWidth = root.clientWidth
  let keyboardOpen = false
  let revealEditor = true
  const overlays = createOverlayViewportTracking()
  const write = (name: string, value: number) => {
    const next = `${Math.round(value)}px`
    if (root.style.getPropertyValue(name) !== next) root.style.setProperty(name, next)
  }
  const update = () => {
    frame = 0
    // Do not turn pinch zoom into a page or dialog resize.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return
    const layoutHeight = root.clientHeight || window.innerHeight
    const visibleHeight = Math.min(layoutHeight, viewport?.height ?? layoutHeight)
    const editing = !!document.activeElement?.matches('textarea:not([readonly]):not([disabled]), input:not([readonly]):not([disabled]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"]):not([type="color"]), [contenteditable="true"]')
    const touchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    // Track the resting height too: Android may resize the layout viewport itself.
    if (Math.abs(root.clientWidth - restingWidth) > 80) {
      restingWidth = root.clientWidth
      restingHeight = layoutHeight
      keyboardOpen = false
    }
    if (!editing && !keyboardOpen) restingHeight = layoutHeight
    keyboardOpen = touchDevice && (editing || keyboardOpen) && Math.max(restingHeight, layoutHeight) - visibleHeight > 120
    if (!keyboardOpen && !editing) restingHeight = layoutHeight
    root.dataset.keyboardOpen = String(keyboardOpen)
    root.dataset.keyboardEditing = String(touchDevice && editing)
    root.dataset.overlayOpen = String(overlays.update())
    // adjustResize shrinks Android's layout viewport during the IME animation.
    // Keep the underlying page at its resting size while the editor is active.
    const pageHeight = touchDevice && (editing || keyboardOpen) ? Math.max(restingHeight, layoutHeight) : layoutHeight
    root.dataset.compactViewport = String(pageHeight <= 740)
    root.dataset.shortViewport = String(pageHeight <= 600)
    write('--viewport-height', pageHeight)
    write('--page-viewport-height', pageHeight)
    write('--overlay-viewport-height', visibleHeight)
    write('--overlay-top', viewport?.offsetTop ?? 0)
    write('--overlay-bottom', Math.max(0, layoutHeight - visibleHeight - (viewport?.offsetTop ?? 0)))
    // Background carousels and message updates must not pull a reader back to
    // the focused input. Reveal it only on focus or viewport changes.
    if (revealEditor && touchDevice && editing) keepEditorVisible(visibleHeight, viewport?.offsetTop ?? 0)
    revealEditor = false
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
  const scheduleEditor = () => { revealEditor = true; schedule() }
  update()
  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(schedule)
  observer?.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] })
  window.addEventListener('resize', scheduleEditor)
  document.addEventListener('focusin', scheduleEditor)
  document.addEventListener('focusout', scheduleEditor)
  viewport?.addEventListener('resize', scheduleEditor)
  viewport?.addEventListener('scroll', scheduleEditor)
  return () => {
    disposePageGestures()
    cancelAnimationFrame(frame)
    observer?.disconnect()
    overlays.dispose()
    window.removeEventListener('resize', scheduleEditor)
    document.removeEventListener('focusin', scheduleEditor)
    document.removeEventListener('focusout', scheduleEditor)
    delete root.dataset.keyboardOpen
    delete root.dataset.keyboardEditing
    delete root.dataset.overlayOpen
    delete root.dataset.compactViewport
    delete root.dataset.shortViewport
    viewport?.removeEventListener('resize', scheduleEditor)
    viewport?.removeEventListener('scroll', scheduleEditor)
    for (const name of ['--viewport-height', '--page-viewport-height', '--overlay-viewport-height', '--overlay-top', '--overlay-bottom']) root.style.removeProperty(name)
  }
}
