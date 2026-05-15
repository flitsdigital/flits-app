import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { ProjectActivity } from '../../lib/projectsDb'
import { UserAvatar } from '../UserAvatar'

const ACTION_LABELS: Record<string, string> = {
  task_created: 'maakte taak aan',
  status_changed: 'wijzigde status',
  commented: 'voegde opmerking toe',
  assigned: 'wees taak toe',
  sprint_changed: 'wijzigde sprint',
  task_deleted: 'verwijderde taak',
}

export function ActivityRow({ activity }: { activity: ProjectActivity }) {
  const actor = activity.actorEmail.split('@')[0]
  const label = ACTION_LABELS[activity.action] ?? activity.action
  const meta = activity.metadata ?? {}
  const taskTitle = typeof meta.taskTitle === 'string' ? meta.taskTitle : undefined
  const newStatus = typeof meta.newStatus === 'string' ? meta.newStatus : undefined

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-subtle/50 last:border-0">
      <UserAvatar profile={{ email: activity.actorEmail }} size="w-6 h-6" textSize="text-[10px]" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary">
          <span className="text-text-primary font-medium">{actor}</span> {label}
          {taskTitle && (
            <span className="text-text-muted">
              {' '}
              op &ldquo;<span className="text-text-secondary">{taskTitle}</span>&rdquo;
            </span>
          )}
          {activity.action === 'status_changed' && newStatus && <span className="text-text-muted"> → {newStatus}</span>}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: nl })}
        </p>
      </div>
    </div>
  )
}
