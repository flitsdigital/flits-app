import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, Bell, MoreHorizontal, LogOut, Zap } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { useNotifications } from '../hooks/useNotifications'
import { usePageTitle } from './PageTitleContext'
import { ALL_NAV, MOBILE_PRIMARY_PAGES, SETTINGS_NAV, filterNavForUser } from '../lib/nav'

interface Props {
  className?: string
}

export function MobileShell({ className }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const toggleInbox = useUIStore((s) => s.toggleInbox)
  const { unreadCount } = useNotifications()
  const { title, subtitle } = usePageTitle()
  const location = useLocation()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const nav = filterNavForUser(profile)
  const isAdmin = profile?.role === 'admin'

  const primaryNav = nav.filter((n) => MOBILE_PRIMARY_PAGES.includes(n.page as never))
  const overflowNav = nav.filter((n) => !MOBILE_PRIMARY_PAGES.includes(n.page as never))
  if (isAdmin) overflowNav.push(SETTINGS_NAV)

  const initials = (profile?.name ?? profile?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className={cn('contents', className)}>
      {/* TopBar */}
      <header className="lg:hidden sticky top-0 z-30 h-12 flex items-center gap-2 px-3 bg-surface-1/95 backdrop-blur border-b border-border-subtle pt-safe">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 rounded text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
        >
          <Menu size={18} />
        </button>

        <Link to="/" className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-5 h-5 rounded bg-yellow-500 flex items-center justify-center shrink-0">
            <Zap size={11} className="text-yellow-900 fill-yellow-900" />
          </div>
          <div className="min-w-0 flex flex-col leading-tight">
            <span className="text-sm font-medium text-text-primary truncate leading-none">
              {title || 'Flits Impact'}
            </span>
            {subtitle && (
              <span className="text-[10px] text-text-muted truncate leading-none mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={toggleInbox}
          className="relative p-2 rounded text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          aria-label="Inbox"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <Avatar className="w-7 h-7 text-2xs shrink-0">
          <AvatarFallback className="bg-surface-3 text-text-secondary border border-border-default text-2xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* NavDrawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[280px] sm:w-[280px] p-0 flex flex-col bg-surface-1 border-border-subtle"
        >
          <SheetHeader className="px-4 py-3 border-b border-border-subtle shrink-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary text-left">
              <div className="w-5 h-5 rounded bg-yellow-500 flex items-center justify-center shrink-0">
                <Zap size={11} className="text-yellow-900 fill-yellow-900" />
              </div>
              Flits Impact
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-px">
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-white/[0.08] text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                    )
                  }
                >
                  <Icon size={16} strokeWidth={1.8} className="shrink-0 opacity-80" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            {isAdmin && (
              <>
                <Separator className="bg-border-subtle my-2" />
                <NavLink
                  to={SETTINGS_NAV.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-white/[0.08] text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                    )
                  }
                >
                  <SETTINGS_NAV.icon size={16} strokeWidth={1.8} className="shrink-0 opacity-80" />
                  <span>{SETTINGS_NAV.label}</span>
                </NavLink>
              </>
            )}
          </nav>

          <Separator className="bg-border-subtle" />
          <div className="p-3 flex items-center gap-2">
            <Avatar className="w-8 h-8 text-xs shrink-0">
              <AvatarFallback className="bg-surface-3 text-text-secondary border border-border-default text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate leading-tight">
                {profile?.name ?? profile?.email ?? ''}
              </p>
              {profile?.role === 'admin' && (
                <p className="text-[10px] text-text-muted leading-tight">Admin</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-text-secondary"
              onClick={() => {
                setDrawerOpen(false)
                signOut()
              }}
            >
              <LogOut size={14} />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* "Meer" bottom-sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-2xl border-border-subtle bg-surface-1 max-h-[80dvh]"
        >
          <SheetHeader className="px-4 py-3 border-b border-border-subtle">
            <SheetTitle className="text-sm font-semibold text-text-primary text-left">
              Meer
            </SheetTitle>
          </SheetHeader>
          <div className="p-2 grid grid-cols-3 gap-1 pb-safe">
            {overflowNav.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.to ||
                (!item.exact && location.pathname.startsWith(item.to + '/'))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 py-4 rounded-lg text-xs transition-colors',
                    active
                      ? 'bg-white/[0.08] text-text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
                  )}
                >
                  <Icon size={20} strokeWidth={1.8} className="opacity-80" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* BottomTabBar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-1/98 backdrop-blur border-t border-border-subtle pb-safe"
        aria-label="Hoofdnavigatie"
      >
        <ul className="grid h-14" style={{ gridTemplateColumns: `repeat(${primaryNav.length + 1}, minmax(0, 1fr))` }}>
          {primaryNav.map((item) => {
            const Icon = item.icon
            const active =
              location.pathname === item.to ||
              (!item.exact && location.pathname.startsWith(item.to + '/'))
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    'h-full flex flex-col items-center justify-center gap-1 text-[10px] transition-colors',
                    active
                      ? 'text-text-primary'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2 : 1.6}
                    className={cn(active ? 'opacity-100' : 'opacity-80')}
                  />
                  <span className={cn(active && 'font-medium')}>{item.label}</span>
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'h-full w-full flex flex-col items-center justify-center gap-1 text-[10px] transition-colors',
                moreOpen
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <MoreHorizontal size={20} strokeWidth={moreOpen ? 2 : 1.6} className="opacity-80" />
              <span className={cn(moreOpen && 'font-medium')}>Meer</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
