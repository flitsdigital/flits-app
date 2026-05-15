import { useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { PageHeader } from '../components/PageHeader'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, type Section } from './settings/settingsConstants'
import {
  ProfielSection,
  UiterlijkSection,
  MeldingenSection,
  WerkruimteSection,
  GebruikersSection,
} from './settings/settingsSections'

export function Settings() {
  usePageMeta('Instellingen → Flits Impact')
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const [active, setActive] = useState<Section>('profiel')

  if (!isAdmin && !profile) return <Navigate to="/" replace />

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 border-r border-border-subtle py-4 px-2 space-y-0.5">
        <p className="text-xs font-semibold text-text-muted px-2 mb-2 uppercase tracking-wider">Instellingen</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-[5px] rounded text-sm transition-colors text-left',
                isActive
                  ? 'bg-white/[0.08] text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
              )}
            >
              <Icon size={14} strokeWidth={1.8} className="shrink-0 opacity-70" />
              {item.label}
            </button>
          )
        })}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <PageHeader
          title={navItems.find((n) => n.id === active)?.label ?? 'Instellingen'}
        />
        <div className="px-6 py-6 max-w-2xl">
          {active === 'profiel' && <ProfielSection />}
          {active === 'uiterlijk' && <UiterlijkSection />}
          {active === 'meldingen' && <MeldingenSection />}
          {active === 'werkruimte' && isAdmin && <WerkruimteSection />}
          {active === 'gebruikers' && isAdmin && <GebruikersSection />}
        </div>
      </main>
    </div>
  )
}
