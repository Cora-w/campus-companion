// Portals can be siblings or nested. Use their actual stacking order, then the
// opening order, so only the visible foreground follows the software keyboard.
export function createOverlayViewportTracking() {
  const seen = new Map<HTMLElement, { order: number; open: boolean }>()
  let order = 0
  return {
    update() {
      const elements = [...document.querySelectorAll<HTMLElement>('.ant-drawer, .ant-modal-wrap')]
      const layers = elements.filter(element => {
        const open = element.classList.contains('ant-drawer')
          ? element.classList.contains('ant-drawer-open')
          : getComputedStyle(element).display !== 'none'
        const previous = seen.get(element)
        seen.set(element, { open, order: open && !previous?.open ? ++order : previous?.order ?? 0 })
        return open
      })
      layers.sort((a, b) => (Number(getComputedStyle(b).zIndex) || 1000) - (Number(getComputedStyle(a).zIndex) || 1000)
        || seen.get(b)!.order - seen.get(a)!.order)
      for (const element of elements) {
        if (layers.includes(element)) element.dataset.viewportActive = String(element === layers[0])
        else delete element.dataset.viewportActive
      }
      for (const element of seen.keys()) if (!element.isConnected) seen.delete(element)
      return layers.length > 0
    },
    dispose() {
      for (const element of seen.keys()) delete element.dataset.viewportActive
      seen.clear()
    },
  }
}

export function keepEditorVisible(visibleHeight: number, offsetTop: number) {
  const editor = document.activeElement
  if (!(editor instanceof HTMLElement)) return
  if (editor.closest<HTMLElement>('.ant-drawer, .ant-modal-wrap')?.dataset.viewportActive === 'false') return
  // Scroll the editor's own container, without panning the document or the
  // covered pages as scrollIntoView would do.
  for (let parent = editor.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (!/auto|scroll/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue
    const field = editor.getBoundingClientRect()
    const bounds = parent.getBoundingClientRect()
    const top = Math.max(bounds.top, offsetTop) + 12
    let bottom = Math.min(bounds.bottom, offsetTop + visibleHeight) - 12
    const drawer = parent.closest('.ant-drawer')
    const footer = drawer?.querySelector('.checkout-footer, .product-purchase-bar, .snack-cart-bar')
    if (footer) bottom = Math.min(bottom, footer.getBoundingClientRect().top - 12)
    const delta = field.top < top || field.height > bottom - top ? field.top - top : Math.max(0, field.bottom - bottom)
    if (Math.abs(delta) > 1) parent.scrollTop += delta
    break
  }
}
