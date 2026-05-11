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
import { useSetPageTitle } from './PageTitleContext'
import { cn } from '@/lib/utils'

export interface BreadcrumbEntry {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbEntry[]
  /** Verberg titel/breadcrumbs op mobiel (mobile topbar toont al de titel). */
  hideTitleOnMobile?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  hideTitleOnMobile = true,
}: PageHeaderProps) {
  // Push titel naar mobile topbar
  const mobileTitle = breadcrumbs && breadcrumbs.length > 0
    ? breadcrumbs[breadcrumbs.length - 1]!.label
    : title
  useSetPageTitle(mobileTitle, subtitle)

  // Op mobiel collapsen we breadcrumbs naar laatste 2
  const mobileCrumbs = breadcrumbs && breadcrumbs.length > 2
    ? breadcrumbs.slice(-2)
    : breadcrumbs

  return (
    <div className="sticky top-0 z-20 bg-surface-0/90 backdrop-blur-sm">
      <div className="flex flex-col gap-2 px-4 lg:px-6 py-2 lg:flex-row lg:items-center lg:justify-between lg:h-10 lg:py-0 lg:gap-3">
        <div
          className={cn(
            'flex items-center gap-2 min-w-0',
            hideTitleOnMobile && 'hidden lg:flex',
          )}
        >
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <>
              {/* Desktop: alle crumbs */}
              <Breadcrumb className="hidden lg:flex">
                <BreadcrumbList className="text-xs gap-1 sm:gap-1.5">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="contents">
                      {i > 0 && <BreadcrumbSeparator className="[&>svg]:size-3" />}
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link
                              to={crumb.href}
                              className="text-text-muted hover:text-text-secondary transition-colors"
                            >
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-text-primary font-medium">
                            {crumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </span>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Mobiel: laatste 2 met ellipsis als ingekort */}
              <Breadcrumb className="lg:hidden min-w-0">
                <BreadcrumbList className="text-xs gap-1">
                  {breadcrumbs.length > 2 && (
                    <>
                      <BreadcrumbItem>
                        <span className="text-text-muted">…</span>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="[&>svg]:size-3" />
                    </>
                  )}
                  {(mobileCrumbs ?? []).map((crumb, i, arr) => (
                    <span key={i} className="contents">
                      {i > 0 && <BreadcrumbSeparator className="[&>svg]:size-3" />}
                      <BreadcrumbItem className={i === arr.length - 1 ? 'min-w-0' : ''}>
                        {crumb.href && i !== arr.length - 1 ? (
                          <BreadcrumbLink asChild>
                            <Link
                              to={crumb.href}
                              className="text-text-muted hover:text-text-secondary transition-colors truncate"
                            >
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-text-primary font-medium truncate">
                            {crumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </span>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </>
          ) : (
            <>
              <h1 className="text-sm font-medium text-text-primary truncate">{title}</h1>
              {subtitle && (
                <span className="text-xs text-text-muted truncate hidden sm:inline">
                  {subtitle}
                </span>
              )}
            </>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap overflow-x-auto overflow-y-visible lg:overflow-visible scrollbar-none -mx-1 px-1">
            {actions}
          </div>
        )}
      </div>
      <Separator className="bg-border-subtle" />
    </div>
  )
}
