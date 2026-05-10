import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

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

  return (
    <PageTitleContext.Provider
      value={{
        title,
        subtitle,
        setTitle: (t, s) => setState({ title: t, subtitle: s }),
      }}
    >
      {children}
    </PageTitleContext.Provider>
  )
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
  useEffect(() => {
    ctx?.setTitle(title, subtitle)
  }, [ctx, title, subtitle])
}
