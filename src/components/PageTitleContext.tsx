import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface Ctx {
  title: string
  subtitle?: string
  setTitle: (title: string, subtitle?: string) => void
}

const PageTitleContext = createContext<Ctx | null>(null)

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [{ title, subtitle }, setState] = useState<{ title: string; subtitle?: string }>({
    title: '',
    subtitle: undefined,
  })

  const setTitle = useCallback((t: string, s?: string) => {
    setState((prev) => (prev.title === t && prev.subtitle === s ? prev : { title: t, subtitle: s }))
  }, [])

  const value = useMemo<Ctx>(
    () => ({ title, subtitle, setTitle }),
    [title, subtitle, setTitle],
  )

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}

export function usePageTitle(): Ctx {
  const ctx = useContext(PageTitleContext)
  if (!ctx) {
    return { title: '', subtitle: undefined, setTitle: () => {} }
  }
  return ctx
}

/** Side-effect hook: zet de titel in de mobile topbar. */
export function useSetPageTitle(title: string, subtitle?: string) {
  const ctx = useContext(PageTitleContext)
  const setRef = useRef(ctx?.setTitle)
  setRef.current = ctx?.setTitle
  useEffect(() => {
    setRef.current?.(title, subtitle)
  }, [title, subtitle])
}
