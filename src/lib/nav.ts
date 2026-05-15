import {
  LayoutDashboard,
  Users,
  GanttChart,
  CalendarDays,
  Car,
  Kanban,
  UserPlus,
  Clock,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { AppPage, UserProfile } from '../types'

export interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
  exact: boolean
  page: AppPage | 'settings'
  group?: string
}

/** Navigatiegroepen voor de sidebar (label → items) */
export const NAV_GROUPS: { label: string; pages: (AppPage | 'settings')[] }[] = [
  { label: 'Overzicht',  pages: ['dashboard'] },
  { label: 'Klanten',    pages: ['clients', 'timeline', 'content', 'leads'] },
  { label: 'Projecten',  pages: ['projects'] },
  { label: 'Financieel', pages: ['reiskosten', 'time_tracking'] },
]

/** Volgorde voor sidebar/drawer (alle items waar de gebruiker toegang toe heeft). */
export const ALL_NAV: NavEntry[] = [
  { to: '/',            label: 'Dashboard',  icon: LayoutDashboard, exact: true,  page: 'dashboard',     group: 'Overzicht'  },
  { to: '/clients',     label: 'Klanten',    icon: Users,           exact: false, page: 'clients',       group: 'Klanten'    },
  { to: '/timeline',    label: 'Timeline',   icon: GanttChart,      exact: false, page: 'timeline',      group: 'Klanten'    },
  { to: '/content',     label: 'Content',    icon: CalendarDays,    exact: false, page: 'content',       group: 'Klanten'    },
  { to: '/leads',       label: 'Leads',      icon: UserPlus,        exact: false, page: 'leads',         group: 'Klanten'    },
  { to: '/projects',    label: 'Projecten',  icon: Kanban,          exact: false, page: 'projects',      group: 'Projecten'  },
  { to: '/reiskosten',  label: 'Reiskosten', icon: Car,             exact: false, page: 'reiskosten',    group: 'Financieel' },
  { to: '/uren',        label: 'Uren',       icon: Clock,           exact: false, page: 'time_tracking', group: 'Financieel' },
]

export const SETTINGS_NAV: NavEntry = {
  to: '/settings',
  label: 'Instellingen',
  icon: Settings,
  exact: false,
  page: 'settings',
}

/** Tabs die op mobiel altijd in de bottom-bar staan (volgorde belangrijk). */
export const MOBILE_PRIMARY_PAGES: AppPage[] = [
  'dashboard',
  'clients',
  'content',
  'leads',
]

export function filterNavForUser(
  profile: Pick<UserProfile, 'role' | 'allowed_pages'> | null | undefined,
): NavEntry[] {
  if (!profile) return []
  if (profile.role === 'admin') return ALL_NAV
  return ALL_NAV.filter((item) =>
    item.page !== 'settings' ? profile.allowed_pages.includes(item.page as AppPage) : false,
  )
}
