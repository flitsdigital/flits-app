import { NavLink } from 'react-router-dom'
import { LogOut, Zap, CheckSquare, Bell } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { useTodosData } from '../hooks/useTodosData'
import { useNotifications } from '../hooks/useNotifications'
import { UserAvatar } from './UserAvatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { filterNavForUser, ALL_NAV, SETTINGS_NAV, NAV_GROUPS, type NavEntry } from '../lib/nav'
import { useAppearanceStore } from '../store/useAppearanceStore'

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onNavigate,
}: NavEntry & { onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2 px-2.5 py-[5px] rounded-md text-sm transition-all duration-100',
          isActive
            ? 'bg-white/[0.09] text-text-primary'
            : 'text-text-muted hover:text-text-primary hover:bg-white/[0.05]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={14}
            strokeWidth={isActive ? 2 : 1.8}
            className={cn('shrink-0', isActive ? 'opacity-90' : 'opacity-55 group-hover:opacity-75')}
          />
          <span className={cn('leading-none', isActive ? 'font-medium' : '')}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

interface Props {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const workspaceName = useAppearanceStore((s) => s.workspaceName)
  const signOut = useAuthStore((s) => s.signOut)
  const toggleTodo = useUIStore((s) => s.toggleTodo)
  const toggleInbox = useUIStore((s) => s.toggleInbox)
  const { openCount } = useTodosData()
  const { unreadCount } = useNotifications()

  const session = useAuthStore((s) => s.session)
  const nav = profile ? filterNavForUser(profile) : session ? ALL_NAV : []

  // Build grouped nav (only show groups that have at least 1 visible item)
  const groupedNav = NAV_GROUPS
    .map(g => ({
      label: g.label,
      items: nav.filter(n => g.pages.includes(n.page)),
    }))
    .filter(g => g.items.length > 0)

  // Single-group edge case: skip group labels if only 1 group
  const showGroupLabels = groupedNav.length > 1

  return (
    <aside
      className={cn(
        'w-[210px] shrink-0 flex flex-col bg-surface-1 border-r border-border-subtle h-screen sticky top-0 select-none',
        className,
      )}
    >
      {/* Workspace header */}
      <div className="h-11 flex items-center px-3 gap-2">
        <div className="w-6 h-6 rounded-md bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0">
          <Zap size={12} className="text-accent-blue fill-accent-blue/50" />
        </div>
        <span className="text-sm font-semibold text-text-primary truncate leading-none flex-1">
          {workspaceName}
        </span>
      </div>

      <Separator className="bg-border-subtle" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-none">
        {showGroupLabels ? (
          groupedNav.map((group, gi) => (
            <div key={group.label} className={cn('space-y-px', gi > 0 && 'mt-4')}>
              <p className="px-2.5 pb-1 text-[10px] font-semibold text-text-disabled uppercase tracking-widest">
                {group.label}
              </p>
              {group.items.map(item => (
                <NavItem key={item.to} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          ))
        ) : (
          <div className="space-y-px">
            {nav.map(item => (
              <NavItem key={item.to} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: todo + inbox + settings + user */}
      <Separator className="bg-border-subtle" />
      <div className="px-2 py-2 space-y-px">
        {/* Todo + Inbox action row */}
        <div className="flex items-center gap-1 px-2.5 py-[5px]">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleTodo}
                  className="relative flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors flex-1"
                >
                  <CheckSquare size={14} strokeWidth={1.8} className="opacity-60 shrink-0" />
                  <span className="leading-none">Taken</span>
                  {openCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue leading-none border border-accent-blue/25">
                      {openCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Taken (T)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleInbox}
                  className="relative p-1 text-text-muted hover:text-text-secondary transition-colors rounded-md hover:bg-white/[0.05]"
                >
                  <Bell size={14} strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-red text-white text-[8px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Inbox</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <NavItem {...SETTINGS_NAV} onNavigate={onNavigate} />

        {/* User row */}
        <div className="flex items-center gap-2 px-2.5 py-[5px] mt-0.5">
          <UserAvatar profile={profile} size="w-5 h-5" textSize="text-[9px]" className="shrink-0" />
          <span className="text-sm text-text-muted truncate flex-1 leading-none">
            {profile?.name ?? profile?.email ?? ''}
          </span>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="h-6 w-6 text-text-disabled hover:text-text-muted"
                >
                  <LogOut size={12} strokeWidth={1.8} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Uitloggen</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </aside>
  )
}
