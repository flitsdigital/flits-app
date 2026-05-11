import { LayoutGrid, List, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewMode = 'kanban' | 'list' | 'activity'

interface Props {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

const MODES = [
  { id: 'kanban' as ViewMode, label: 'Board', Icon: LayoutGrid },
  { id: 'list' as ViewMode, label: 'Lijst', Icon: List },
  { id: 'activity' as ViewMode, label: 'Activiteit', Icon: Activity },
]

export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center bg-surface-0 border border-border-subtle rounded-lg p-0.5">
      {MODES.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
            mode === id ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary',
          )}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}
