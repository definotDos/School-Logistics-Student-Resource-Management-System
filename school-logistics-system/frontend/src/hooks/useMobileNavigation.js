import { useEffect, useRef, useState } from 'react'

// Disclosure menus stay in the page flow and never trap keyboard focus.
export default function useMobileNavigation(breakpoint) {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const close = () => setNavigationOpen(false)
    media.addEventListener('change', close)
    return () => media.removeEventListener('change', close)
  }, [breakpoint])

  useEffect(() => {
    if (!navigationOpen) return
    const dismiss = (event) => {
      if (!navigationRef.current?.contains(event.target)) setNavigationOpen(false)
    }
    const escape = (event) => {
      if (event.key === 'Escape') {
        setNavigationOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('focusin', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('focusin', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [navigationOpen])

  return { navigationOpen, setNavigationOpen, navigationRef, toggleRef }
}
