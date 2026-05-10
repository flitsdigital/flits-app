import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { filterNavForUser, SETTINGS_NAV } from '../lib/nav'
import { leadsDb } from '../lib/leadsDb'
import type { Lead, Post } from '../types'

function postSearchValue(post: Post, clientName: string): string {
  const cap = post.caption ?? ''
  const type = post.type ?? ''
  const status = post.status ?? ''
  return `${post.id} ${cap} ${type} ${status} ${clientName}`.trim()
}

export function GlobalSearchDialog() {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const clients = useStore((s) => s.clients)
  const posts = useStore((s) => s.posts)
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    if (!session) return
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        const t = e.target as HTMLElement | null
        if (t?.closest?.('[data-global-search-ignore]')) return
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [session])

  useEffect(() => {
    if (!open || !session) return
    let cancelled = false
    void leadsDb.fetchAll().then((data) => {
      if (!cancelled) setLeads(data)
    })
    return () => {
      cancelled = true
    }
  }, [open, session])

  const clientById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of clients) m.set(c.id, c.companyName)
    return m
  }, [clients])

  const navItems = useMemo(() => {
    if (!profile) return []
    const base = filterNavForUser(profile).map((e) => ({
      to: e.to,
      label: e.label,
      Icon: e.icon,
      page: e.page,
    }))
    if (profile.role === 'admin') {
      base.push({
        to: SETTINGS_NAV.to,
        label: SETTINGS_NAV.label,
        Icon: SETTINGS_NAV.icon,
        page: 'settings' as const,
      })
    }
    return base
  }, [profile])

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 60)
  }, [posts])

  const hasPage = (page: string) => {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (page === 'settings') return false
    return profile.allowed_pages.includes(page as (typeof profile.allowed_pages)[number])
  }

  if (!session) return null

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Zoek pagina's, klanten, leads, posts…"
        className="h-12"
      />
      <CommandList>
        <CommandEmpty>Geen resultaten.</CommandEmpty>

        {navItems.length > 0 && (
          <CommandGroup heading="Pagina's">
            {navItems.map((item) => (
              <CommandItem
                key={item.to}
                value={`pagina ${item.label} ${item.to}`}
                onSelect={() => {
                  navigate(item.to)
                  setOpen(false)
                }}
              >
                <item.Icon className="text-muted-foreground" />
                <span>{item.label}</span>
                <CommandShortcut>{item.to}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasPage('clients') && clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Klanten">
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`klant ${c.companyName} ${c.contactPerson} ${c.email} ${c.id}`}
                  onSelect={() => {
                    navigate(`/clients/${c.id}`)
                    setOpen(false)
                  }}
                >
                  <Users className="text-muted-foreground" />
                  <span className="truncate">{c.companyName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {hasPage('leads') && leads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leads">
              {leads.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lead ${l.companyName} ${l.contactPerson} ${l.email} ${l.id}`}
                  onSelect={() => {
                    navigate(`/leads/${l.id}`)
                    setOpen(false)
                  }}
                >
                  <UserPlus className="text-muted-foreground" />
                  <span className="truncate">{l.companyName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {hasPage('content') && sortedPosts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Posts">
              {sortedPosts.map((p) => {
                const cn = clientById.get(p.clientId) ?? 'Onbekende klant'
                return (
                  <CommandItem
                    key={p.id}
                    value={postSearchValue(p, cn)}
                    onSelect={() => {
                      navigate('/content')
                      setOpen(false)
                    }}
                  >
                    <FileText className="text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {cn}
                      {p.caption ? ` — ${p.caption}` : ''}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
