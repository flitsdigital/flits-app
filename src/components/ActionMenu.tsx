import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface ActionMenuItem {
  label: string
  icon?: React.ElementType
  onClick: (e: React.MouseEvent) => void
  variant?: 'default' | 'destructive'
  separator?: boolean  // toon separator vóór dit item
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  trigger?: React.ReactNode
  /** Extra klassen voor de trigger-knop */
  className?: string
  align?: 'start' | 'end' | 'center'
}

export function ActionMenu({ items, trigger, className, align = 'end' }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(
              'p-1 rounded text-text-muted hover:text-text-secondary hover:bg-white/[0.06] transition-colors',
              className,
            )}
            onClick={e => e.stopPropagation()}
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[140px]">
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <span key={i}>
              {item.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  item.onClick(e as unknown as React.MouseEvent)
                }}
                className={cn(
                  'gap-2 text-xs',
                  item.variant === 'destructive' && 'text-red-400 focus:text-red-400 focus:bg-red-500/10',
                )}
              >
                {Icon && <Icon size={12} />}
                {item.label}
              </DropdownMenuItem>
            </span>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
