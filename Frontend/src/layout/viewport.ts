// Keep the page on the layout viewport; only overlays follow the keyboard.
export function installViewportTracking() {
  const root = document.documentElement
  const viewport = window.visualViewport
  let frame = 0
  let restingHeight = root.clientHeight || window.innerHeight
  let restingWidth = root.clientWidth
  let keyboardOpen = false
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
    write('--viewport-height', layoutHeight)
    write('--overlay-viewport-height', visibleHeight)
    write('--overlay-bottom', Math.max(0, layoutHeight - visibleHeight - (viewport?.offsetTop ?? 0)))
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
  update()
  window.addEventListener('resize', schedule)
  document.addEventListener('focusin', schedule)
  document.addEventListener('focusout', schedule)
  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)
    document.removeEventListener('focusin', schedule)
    document.removeEventListener('focusout', schedule)
    delete root.dataset.keyboardOpen
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
    for (const name of ['--viewport-height', '--overlay-viewport-height', '--overlay-bottom']) root.style.removeProperty(name)
  }
}
