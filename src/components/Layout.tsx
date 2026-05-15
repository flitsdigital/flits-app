import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileShell } from './MobileShell'
import { PageTitleProvider } from './PageTitleContext'
import { useStoreBootstrap } from '../hooks/useStoreBootstrap'

export function Layout() {
  useStoreBootstrap()
  return (
    <PageTitleProvider>
      <div className="flex min-h-dvh bg-surface-0 text-text-primary lg:h-screen lg:overflow-hidden">
        <Sidebar className="hidden lg:flex" />
        <div className="flex flex-col flex-1 min-w-0">
          <MobileShell />
          <main className="flex-1 overflow-auto min-w-0 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </PageTitleProvider>
  )
}
