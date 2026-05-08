import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-surface-0/80 backdrop-blur-md border-b border-border-subtle">
      <div className="flex items-center justify-between px-8 h-14">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
          {subtitle && (
            <>
              <span className="text-border-subtle">·</span>
              <span className="text-xs text-text-muted">{subtitle}</span>
            </>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
