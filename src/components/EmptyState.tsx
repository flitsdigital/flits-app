import type { ElementType } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Props {
  icon?: ElementType
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  /** 'page' = groot/gecentreerd (hele pagina). 'inline' = compacter (binnen een sectie). */
  variant?: 'page' | 'inline'
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, variant = 'page', className }: Props) {
  const isInline = variant === 'inline'

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center px-4',
      isInline ? 'py-8' : 'py-16',
      className,
    )}>
      {Icon && (
        <div className={cn(
          'rounded-2xl border border-border-subtle flex items-center justify-center mb-4',
          'bg-accent-blue/[0.06] border-accent-blue/20',
          isInline ? 'w-10 h-10' : 'w-14 h-14',
        )}>
          <Icon size={isInline ? 16 : 24} className="text-accent-blue/60" />
        </div>
      )}
      <p className={cn(
        'font-medium text-text-primary mb-1',
        isInline ? 'text-xs' : 'text-sm',
      )}>
        {title}
      </p>
      {description && (
        <p className={cn(
          'text-text-muted max-w-xs',
          isInline ? 'text-xs' : 'text-xs mt-0.5',
        )}>
          {description}
        </p>
      )}
      {action && (
        <Button
          size="sm"
          className={cn('mt-4', isInline && 'mt-3 text-xs h-7 px-3')}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
