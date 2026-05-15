import { format, parseISO } from 'date-fns'
import { Square, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeEntry, TimeTag } from '../../types'
import { getDurationSeconds, formatDuration } from './timeTrackingHelpers'
import { TagPill } from './TimeTrackingTagUI'

export function TimeTrackingEntryRow({
  entry,
  now,
  clientMap,
  tagMap,
  onEdit,
  onDelete,
  onStop,
  showUser,
  userMap,
}: {
  entry: TimeEntry
  now: number
  clientMap: Record<string, string>
  tagMap: Record<string, TimeTag>
  onEdit: () => void
  onDelete: () => void
  onStop?: () => void
  showUser: boolean
  userMap: Record<string, string>
}) {
  const duration = getDurationSeconds(entry, now)
  const tags = entry.tagIds.map((id) => tagMap[id]).filter(Boolean) as TimeTag[]

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 group transition-colors',
        entry.isRunning ? 'bg-green-500/[0.04] hover:bg-green-500/[0.06]' : 'hover:bg-white/[0.03]',
      )}
    >
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', entry.isRunning ? 'bg-green-400 animate-pulse' : 'bg-transparent')} />
      <div className="text-xs text-text-muted tabular-nums shrink-0 w-24">
        {format(parseISO(entry.startedAt), 'HH:mm')}
        {' – '}
        {entry.endedAt ? format(parseISO(entry.endedAt), 'HH:mm') : '…'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', entry.description ? 'text-text-primary' : 'text-text-muted italic')}>
          {entry.description || 'Geen omschrijving'}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {entry.clientId && clientMap[entry.clientId] && (
            <span className="text-[10px] text-text-muted">{clientMap[entry.clientId]}</span>
          )}
          {showUser && userMap[entry.userId] && <span className="text-[10px] text-text-muted/60">{userMap[entry.userId]}</span>}
          {tags.map((t) => (
            <TagPill key={t.id} tag={t} />
          ))}
        </div>
      </div>
      <span className={cn('text-sm font-semibold tabular-nums shrink-0', entry.isRunning ? 'text-green-400' : 'text-text-primary')}>
        {formatDuration(duration)}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {entry.isRunning && onStop && (
          <button
            type="button"
            onClick={onStop}
            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
            title="Timer stoppen"
          >
            <Square size={13} />
          </button>
        )}
        <button type="button" onClick={onEdit} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
          <Pencil size={13} />
        </button>
        <button type="button" onClick={onDelete} className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
