import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface BreadcrumbEntry {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbEntry[]
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-surface-0/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 h-10">
        <div className="flex items-center gap-2">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1 sm:gap-1.5">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="contents">
                    {i > 0 && <BreadcrumbSeparator className="[&>svg]:size-3" />}
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink asChild>
                          <Link to={crumb.href} className="text-text-muted hover:text-text-secondary transition-colors">
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-text-primary font-medium">{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          ) : (
            <>
              <h1 className="text-sm font-medium text-text-primary">{title}</h1>
              {subtitle && (
                <span className="text-xs text-text-muted">{subtitle}</span>
              )}
            </>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1.5">
            {actions}
          </div>
        )}
      </div>
      <Separator className="bg-border-subtle" />
    </div>
  )
}
