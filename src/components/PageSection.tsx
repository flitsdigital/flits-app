import { cn } from '@/lib/utils'
import { SectionHeader } from './SectionHeader'

interface PageSectionProps {
  title?: string
  icon?: React.ElementType
  count?: number
  action?: React.ReactNode
  to?: string
  children: React.ReactNode
  className?: string
  /** Verwijdert de buitenste card-wrapper (voor ingebedde secties) */
  bare?: boolean
}

export function PageSection({ title, icon, count, action, to, children, className, bare }: PageSectionProps) {
  if (bare) {
    return (
      <div className={className}>
        {title && (
          <SectionHeader icon={icon} title={title} count={count} action={action} to={to} />
        )}
        {children}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border border-border-subtle bg-surface-card shadow-card overflow-hidden',
      className,
    )}>
      {title && (
        <SectionHeader icon={icon} title={title} count={count} action={action} to={to} />
      )}
      {children}
    </div>
  )
}
