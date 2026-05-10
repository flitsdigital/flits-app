import { useEffect, useState } from 'react'

function getMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => getMatch(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True onder Tailwind 'lg' (1024px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023.98px)')
}

/** True onder Tailwind 'sm' (640px). */
export function useIsSmall(): boolean {
  return useMediaQuery('(max-width: 639.98px)')
}
