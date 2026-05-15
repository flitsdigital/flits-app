import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── ListTable wrapper ──────────────────────────────────────────────────────

interface ListTableProps {
  children: React.ReactNode
  className?: string
}

export function ListTable({ children, className }: ListTableProps) {
  return (
    <div className={cn(
      'rounded-xl border border-border-subtle bg-surface-card shadow-card overflow-hidden',
      className,
    )}>
      {children}
    </div>
  )
}

// ── Column header row ──────────────────────────────────────────────────────

interface ListHeaderProps {
  children: React.ReactNode
  className?: string
}

export function ListHeader({ children, className }: ListHeaderProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2 border-b border-border-subtle bg-surface-2/60',
      className,
    )}>
      {children}
    </div>
  )
}

// ── Sortable column button ─────────────────────────────────────────────────

interface SortButtonProps {
  label: string
  active?: boolean
  asc?: boolean
  onClick?: () => void
  className?: string
}

export function SortButton({ label, active, asc, onClick, className }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs font-medium transition-colors select-none',
        active ? 'text-text-secondary' : 'text-text-muted hover:text-text-secondary',
        className,
      )}
    >
      {label}
      {active ? (
        asc ? <ChevronUp size={11} /> : <ChevronDown size={11} />
      ) : (
        <span className="w-[11px]" />
      )}
    </button>
  )
}

// ── Table body divider ─────────────────────────────────────────────────────

export function ListBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('divide-y divide-border-subtle/60', className)}>
      {children}
    </div>
  )
}

// ── Empty table state ──────────────────────────────────────────────────────

export function ListEmpty({ text, icon: Icon }: { text: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      {Icon && <Icon size={20} className="text-text-muted opacity-30" />}
      <p className="text-xs text-text-muted">{text}</p>
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────

interface ListRowProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  /** Als true, zebra achtergrond */
  striped?: boolean
}

export function ListRow({ children, onClick, className, striped }: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-colors',
        onClick && 'cursor-pointer hover:bg-white/[0.03]',
        striped && 'bg-white/[0.01]',
        className,
      )}
    >
      {children}
    </div>
  )
}
