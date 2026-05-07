import clsx from 'clsx'
import type { InvoiceStatus } from '../lib/billing'

const config: Record<InvoiceStatus, { label: string; className: string }> = {
  overdue: { label: 'Verlopen', className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  this_week: { label: 'Deze week', className: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  upcoming: { label: 'Binnenkort', className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  ok: { label: 'Gepland', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = config[status]
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', className)}>
      {label}
    </span>
  )
}
