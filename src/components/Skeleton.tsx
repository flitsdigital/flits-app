import { cn } from '@/lib/utils'

// ── Base pulse ──────────────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-white/[0.06]', className)} />
  )
}

// ── Skeleton row (voor lijstweergaven) ─────────────────────────────────────

export function SkeletonRow({ cols = 4, className }: { cols?: number; className?: string }) {
  const widths = ['w-1/3', 'w-1/4', 'w-1/5', 'w-1/6', 'w-1/5', 'w-1/4']
  return (
    <div className={cn('flex items-center gap-4 px-4 py-3 border-b border-border-subtle/50', className)}>
      <Pulse className="w-6 h-6 rounded-full shrink-0" />
      {Array.from({ length: cols }).map((_, i) => (
        <Pulse key={i} className={cn('h-3', widths[i % widths.length])} />
      ))}
    </div>
  )
}

// ── Skeleton table ──────────────────────────────────────────────────────────

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  )
}

// ── Skeleton card ───────────────────────────────────────────────────────────

export function SkeletonCard({ height = 88, className }: { height?: number; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-surface-card p-4 space-y-2.5',
        className,
      )}
      style={{ minHeight: height }}
    >
      <div className="flex items-start justify-between gap-2">
        <Pulse className="h-3 w-24" />
        <Pulse className="w-5 h-5 rounded" />
      </div>
      <Pulse className="h-6 w-16" />
      <Pulse className="h-3 w-32" />
    </div>
  )
}

// ── Skeleton KPI grid ───────────────────────────────────────────────────────

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ── Skeleton text lines ─────────────────────────────────────────────────────

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/6']
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse key={i} className={cn('h-3', widths[i % widths.length])} />
      ))}
    </div>
  )
}

// ── Skeleton kanban card ────────────────────────────────────────────────────

export function SkeletonKanbanCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-md border border-border-subtle bg-surface-card p-3 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Pulse className="w-1.5 h-1.5 rounded-full" />
        <Pulse className="h-3 flex-1" />
      </div>
      <Pulse className="h-2.5 w-3/4" />
      <div className="flex items-center justify-between pt-1">
        <Pulse className="h-2.5 w-12 rounded-full" />
        <Pulse className="w-5 h-5 rounded-full" />
      </div>
    </div>
  )
}
