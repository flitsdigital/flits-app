import type { ElementType } from 'react'
import { User, Palette, Bell, Building2, Users } from 'lucide-react'
import type { AppPage } from '../../types'

export const PAGE_OPTIONS: { id: AppPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clients', label: 'Klanten' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'content', label: 'Content' },
  { id: 'reiskosten', label: 'Reiskosten' },
  { id: 'projects', label: 'Projecten' },
  { id: 'leads', label: 'Leads' },
  { id: 'time_tracking', label: 'Uren' },
]

export type Section = 'profiel' | 'uiterlijk' | 'meldingen' | 'werkruimte' | 'gebruikers'

export interface NavItem {
  id: Section
  label: string
  icon: ElementType
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'profiel', label: 'Profiel', icon: User },
  { id: 'uiterlijk', label: 'Uiterlijk', icon: Palette },
  { id: 'meldingen', label: 'Meldingen', icon: Bell },
  { id: 'werkruimte', label: 'Werkruimte', icon: Building2, adminOnly: true },
  { id: 'gebruikers', label: 'Gebruikers', icon: Users, adminOnly: true },
]
