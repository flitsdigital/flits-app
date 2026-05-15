import { Folder, Edit2 } from 'lucide-react'
import clsx from 'clsx'
import type { Project } from '../../types'
import { PROJECT_STATUS_CONFIG } from './projectsPageConstants'
import { usePermissions } from '../../hooks/usePermissions'

export function ProjectCard({
  project,
  clientName,
  taskCount,
  onClick,
  onEdit,
}: {
  project: Project
  clientName: string
  taskCount: number
  onClick: () => void
  onEdit: () => void
}) {
  const statusCfg = PROJECT_STATUS_CONFIG[project.status]
  const { can } = usePermissions()

  return (
    <div
      onClick={onClick}
      className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-all group relative shadow-card"
    >
      <div className="h-1 w-full" style={{ backgroundColor: project.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-text-primary leading-snug">{project.name}</h3>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all p-1 rounded-md hover:bg-white/[0.06] shrink-0"
          >
            <Edit2 size={12} />
          </button>
        </div>

        <p className="text-xs text-text-muted mb-3">{clientName}</p>

        {project.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3">{project.description}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border', statusCfg.cls)}>
              {statusCfg.label}
            </span>
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Folder size={10} />
              {taskCount} {taskCount === 1 ? 'taak' : 'taken'}
            </span>
          </div>

          {can('financials') && project.value != null && project.value > 0 && (
            <span className="text-xs font-medium text-text-secondary tabular-nums shrink-0">
              €{project.value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
        </div>

        {/* Factuurvoortgang — alleen tonen als er een waarde is */}
        {can('financials') && project.value != null && project.value > 0 && (() => {
          const invoiced = Math.min(project.invoicedAmount ?? 0, project.value)
          const open = project.value - invoiced
          const pct = Math.round((invoiced / project.value) * 100)
          const fmt = (n: number) => `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          return (
            <div className="mt-2.5 space-y-1">
              <div className="w-full h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', pct >= 100 ? 'bg-green-500/60' : 'bg-accent-blue/50')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-disabled">
                  {fmt(invoiced)} gefactureerd
                </span>
                {open > 0 ? (
                  <span className="text-[10px] text-amber-400/80 font-medium">{fmt(open)} open</span>
                ) : (
                  <span className="text-[10px] text-green-400/80 font-medium">Volledig</span>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
