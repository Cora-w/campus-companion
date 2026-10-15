// Block native page zoom without stopping image viewers' custom touch handlers.
// Capture is necessary because a viewer or carousel can stop bubbling events.
export function installPageGestureGuard() {
  const options = { capture: true, passive: false } as const
  const preventPinch = (event: TouchEvent) => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault()
  }
  const preventNativeGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault()
  }
  document.addEventListener('touchstart', preventPinch, options)
  document.addEventListener('touchmove', preventPinch, options)
  // Safari may honor gesture events even when the viewport disallows zoom.
  const gestures = ['gesturestart', 'gesturechange', 'gestureend']
  for (const name of gestures) document.addEventListener(name, preventNativeGesture, options)
  return () => {
    document.removeEventListener('touchstart', preventPinch, options)
    document.removeEventListener('touchmove', preventPinch, options)
    for (const name of gestures) document.removeEventListener(name, preventNativeGesture, options)
  }
}
