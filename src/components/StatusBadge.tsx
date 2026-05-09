import type { ClientStatus } from '../types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const config: Record<ClientStatus, { label: string; className: string }> = {
  active:   { label: 'Actief',      className: 'bg-green-500/15 text-green-400 border-green-500/25 hover:bg-green-500/20' },
  paused:   { label: 'Gepauzeerd', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25 hover:bg-zinc-500/20' },
  inactive: { label: 'Inactief',    className: 'bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20' },
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  const { label, className } = config[status]
  return (
    <Badge variant="outline" className={cn('rounded-md text-xs font-medium', className)}>
      {label}
    </Badge>
  )
}
