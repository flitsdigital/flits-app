import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GanttChart,
  CalendarDays,
  Car,
  Settings,
  LogOut,
  Kanban,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '../store/useAuthStore'
import type { AppPage } from '../types'

const ALL_NAV: { to: string; label: string; icon: React.ElementType; exact: boolean; page: AppPage }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, page: 'dashboard' },
  { to: '/clients', label: 'Klanten', icon: Users, exact: false, page: 'clients' },
  { to: '/timeline', label: 'Timeline', icon: GanttChart, exact: false, page: 'timeline' },
  { to: '/content', label: 'Content', icon: CalendarDays, exact: false, page: 'content' },
  { to: '/reiskosten', label: 'Reiskosten', icon: Car, exact: false, page: 'reiskosten' },
  { to: '/projects',   label: 'Projecten',  icon: Kanban, exact: false, page: 'projects' },
]

export function Sidebar() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  const isAdmin = profile?.role === 'admin'
  const nav = ALL_NAV.filter(({ page }) => isAdmin || (profile?.allowed_pages ?? []).includes(page))

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-surface-1 border-r border-border-subtle h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-[13px] border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-accent-blue flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">Agency CRM</p>
            <p className="text-[11px] text-text-muted mt-0.5">Social Media</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-white/[0.07] text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              )
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border-subtle space-y-0.5">
        {/* Alleen admin ziet Instellingen */}
        {isAdmin && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-white/[0.07] text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              )
            }
          >
            <Settings size={16} strokeWidth={1.8} />
            Instellingen
          </NavLink>
        )}

        {/* Naam + uitloggen */}
        {profile?.name && (
          <p className="px-3 pt-1 text-xs text-text-muted truncate">{profile.name}</p>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
