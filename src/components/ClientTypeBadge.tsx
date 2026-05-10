import { cn } from '@/lib/utils'
import type { ClientType } from '@/types'
import { RefreshCw, FolderKanban, Receipt } from 'lucide-react'

const config: Record<
  ClientType,
  { label: string; className: string; Icon: typeof RefreshCw }
> = {
  recurring: {
    label: 'Retainer',
    className: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    Icon: RefreshCw,
  },
  project: {
    label: 'Project',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Icon: FolderKanban,
  },
  oneoff: {
    label: 'Eenmalig',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    Icon: Receipt,
  },
}

export function ClientTypeBadge({
  type,
  className,
}: {
  type: ClientType | undefined
  className?: string
}) {
  const t = type ?? 'recurring'
  const { label, className: chip, Icon } = config[t]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        chip,
        className,
      )}
    >
      <Icon size={10} className="opacity-80" />
      {label}
    </span>
  )
}
