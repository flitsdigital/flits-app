import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  icon?: React.ElementType
  title: string
  count?: number
  to?: string
  action?: React.ReactNode
  className?: string
  /** Als true, geen border-bottom (voor gebruik binnen een card/sectie) */
  noBorder?: boolean
}

export function SectionHeader({ icon: Icon, title, count, to, action, className, noBorder }: SectionHeaderProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2.5',
      !noBorder && 'border-b border-border-subtle',
      className,
    )}>
      {Icon && <Icon size={13} className="text-text-muted shrink-0" />}
      <span className="text-xs font-semibold text-text-secondary flex-1 truncate">{title}</span>

      {count != null && (
        <span className="text-[10px] bg-surface-3 border border-border-default text-text-muted rounded px-1.5 py-0.5 font-medium tabular-nums shrink-0">
          {count}
        </span>
      )}

      {action && <div className="shrink-0">{action}</div>}

      {to && !action && (
        <Link
          to={to}
          className="text-[10px] text-text-muted hover:text-text-secondary transition-colors flex items-center gap-0.5 shrink-0"
        >
          Alles <ArrowRight size={9} />
        </Link>
      )}
    </div>
  )
}
