import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AccentColor = 'blue' | 'green' | 'orange' | 'red' | 'purple'

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  sub?: string
  trend?: { value: number; direction: 'up' | 'down'; positive?: boolean }
  accent?: AccentColor
  to?: string
  loading?: boolean
  className?: string
}

// Icon background tints — subtle, not distracting
const ACCENT_ICON: Record<AccentColor, string> = {
  blue:   'bg-blue-500/10 text-blue-400/70',
  green:  'bg-green-500/10 text-green-400/70',
  orange: 'bg-orange-500/10 text-orange-400/70',
  red:    'bg-red-500/10 text-red-400/70',
  purple: 'bg-purple-500/10 text-purple-400/70',
}

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-white/[0.06]', className)} />
}

export function KpiCard({ label, value, icon: Icon, sub, trend, accent, to, loading, className }: KpiCardProps) {
  const iconCls = accent ? ACCENT_ICON[accent] : 'bg-white/[0.04] text-text-muted'

  const inner = (
    <CardContent className="p-4">
      {loading ? (
        <div className="space-y-2">
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-6 w-16" />
          <SkeletonPulse className="h-3 w-20" />
        </div>
      ) : (
        <>
          {/* Header: label + icon */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs text-text-muted leading-tight">{label}</p>
            <div className={cn('p-1.5 rounded-md shrink-0', iconCls)}>
              <Icon size={12} />
            </div>
          </div>

          {/* Value — always white */}
          <p className="text-xl font-semibold text-text-primary tabular-nums truncate leading-none">
            {value}
          </p>

          {/* Sub text + trend */}
          <div className="flex items-center gap-2 mt-2">
            {sub && <p className="text-xs text-text-muted truncate flex-1">{sub}</p>}
            {trend && (
              <span className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium shrink-0 ml-auto',
                (trend.positive === undefined ? trend.direction === 'up' : trend.positive)
                  ? 'text-green-400'
                  : 'text-red-400',
              )}>
                {trend.direction === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {trend.value}%
              </span>
            )}
          </div>
        </>
      )}
    </CardContent>
  )

  const cardCls = cn(
    'transition-colors duration-150',
    to ? 'hover:bg-white/[0.025] cursor-pointer' : '',
    className,
  )

  if (to) {
    return <Card className={cardCls}><Link to={to}>{inner}</Link></Card>
  }
  return <Card className={cardCls}>{inner}</Card>
}
