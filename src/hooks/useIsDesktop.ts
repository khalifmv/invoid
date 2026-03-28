import { useEffect, useState } from 'react'

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQueryList = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const update = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
    }

    mediaQueryList.addEventListener('change', update)

    return () => {
      mediaQueryList.removeEventListener('change', update)
    }
  }, [])

  return isDesktop
}
