import { Zap } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { Sprint } from '../../lib/projectsDb'

interface Props {
  sprint: Sprint
  doneCount?: number
  totalCount?: number
}

export function SprintBanner({ sprint, doneCount = 0, totalCount = 0 }: Props) {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  return (
    <div className="px-6 py-2 border-b border-border-subtle bg-blue-500/[0.04] flex items-center gap-3 shrink-0">
      <Zap size={12} className="text-blue-400 shrink-0" />
      <span className="text-xs text-blue-400 font-medium">{sprint.name}</span>
      {sprint.endDate && (
        <span className="text-xs text-text-muted">
          t/m {format(new Date(sprint.endDate + 'T00:00:00'), 'd MMM', { locale: nl })}
        </span>
      )}
      {totalCount > 0 && (
        <>
          <div className="flex-1 max-w-32 h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-text-muted">{pct}%</span>
        </>
      )}
    </div>
  )
}
