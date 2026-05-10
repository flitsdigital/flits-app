import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { X, Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useUIStore } from '../store/useUIStore'
import { useNotifications } from '../hooks/useNotifications'
import clsx from 'clsx'

export function InboxSheet() {
  const inboxOpen = useUIStore((s) => s.inboxOpen)
  const closeInbox = useUIStore((s) => s.closeInbox)
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications()
  const navigate = useNavigate()

  async function handleClick(id: string, url: string | null) {
    await markRead(id)
    if (url) {
      closeInbox()
      navigate(url)
    }
  }

  return (
    <Sheet open={inboxOpen} onOpenChange={(v) => !v && closeInbox()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[380px] sm:max-w-[380px] p-0 flex flex-col bg-surface-1 border-border-subtle"
      >
        <SheetHeader className="px-4 py-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-sm font-semibold text-text-primary">Inbox</SheetTitle>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="h-6 text-xs text-text-muted hover:text-text-secondary gap-1 px-2"
                >
                  <CheckCheck size={12} />
                  Alles gelezen
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={closeInbox} className="h-6 w-6 text-text-muted">
                <X size={14} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center px-6">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-border-subtle flex items-center justify-center">
                <Bell size={18} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-secondary font-medium">Geen meldingen</p>
              <p className="text-xs text-text-muted">Je ontvangt hier een melding als iemand je @-vermeldt.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n.id, n.contextUrl)}
                  className={clsx(
                    'w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors flex items-start gap-3',
                    !n.read && 'bg-accent-blue/[0.04]',
                  )}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    <div
                      className={clsx(
                        'w-2 h-2 rounded-full',
                        n.read ? 'bg-transparent' : 'bg-accent-blue',
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm leading-snug', n.read ? 'text-text-secondary' : 'text-text-primary')}>
                      {n.content}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
