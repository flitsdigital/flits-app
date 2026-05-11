import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '../../types'

interface PriorityConfig {
  label: string
  color: string
  flagColor: string
  border: string
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low:    { label: 'Laag',    color: 'text-zinc-400',   flagColor: 'text-zinc-500',   border: 'border-l-zinc-700' },
  medium: { label: 'Normaal', color: 'text-blue-400',   flagColor: 'text-blue-500',   border: 'border-l-blue-600' },
  high:   { label: 'Hoog',    color: 'text-orange-400', flagColor: 'text-orange-500', border: 'border-l-orange-500' },
  urgent: { label: 'Urgent',  color: 'text-red-400',    flagColor: 'text-red-500',    border: 'border-l-red-500' },
}

interface Props {
  priority: TaskPriority
  showLabel?: boolean
  className?: string
}

export function PriorityBadge({ priority, showLabel = false, className }: Props) {
  if (priority === 'medium' && !showLabel) return null
  const config = PRIORITY_CONFIG[priority]
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-medium', config.flagColor, className)}>
      <Flag size={9} />
      {showLabel && <span className={config.color}>{config.label}</span>}
    </span>
  )
}
