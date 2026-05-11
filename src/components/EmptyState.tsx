import type { ElementType } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Props {
  icon?: ElementType
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center px-4', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-border-subtle flex items-center justify-center mb-4">
          <Icon size={20} className="text-text-muted" />
        </div>
      )}
      <p className="text-sm text-text-secondary font-medium mb-1">{title}</p>
      {description && <p className="text-xs text-text-muted max-w-xs">{description}</p>}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
