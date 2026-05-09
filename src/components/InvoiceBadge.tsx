import type { InvoiceStatus } from '../lib/billing'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const config: Record<InvoiceStatus, { label: string; className: string }> = {
  overdue:   { label: 'Verlopen',   className: 'bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20' },
  this_week: { label: 'Deze week',  className: 'bg-orange-500/15 text-orange-400 border-orange-500/25 hover:bg-orange-500/20' },
  upcoming:  { label: 'Binnenkort', className: 'bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20' },
  ok:        { label: 'Gepland',    className: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700' },
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = config[status]
  return (
    <Badge variant="outline" className={cn('rounded-md text-xs font-medium', className)}>
      {label}
    </Badge>
  )
}
