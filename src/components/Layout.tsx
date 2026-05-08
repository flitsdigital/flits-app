import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen bg-surface-0 text-text-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto h-full">
        <Outlet />
      </main>
    </div>
  )
}
