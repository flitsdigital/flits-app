import { cn } from '@/lib/utils'
import type { TaskStatus } from '../../types'

interface Props {
  date: string | null | undefined
  status?: TaskStatus
  className?: string
}

export function DueDateBadge({ date, status, className }: Props) {
  if (!date) return null
  const isOverdue = new Date(date) < new Date() && status !== 'done'
  return (
    <span
      className={cn(
        'text-xs px-1.5 py-0.5 rounded',
        isOverdue ? 'text-red-400 bg-red-500/10' : 'text-text-muted bg-white/[0.04]',
        className,
      )}
    >
      {new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
    </span>
  )
}
