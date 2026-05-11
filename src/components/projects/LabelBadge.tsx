import { cn } from '@/lib/utils'
import type { ProjectLabel } from '../../types'

interface Props {
  label: ProjectLabel
  size?: 'dot' | 'pill'
  className?: string
}

export function LabelBadge({ label, size = 'pill', className }: Props) {
  if (size === 'dot') {
    return (
      <span
        title={label.name}
        className={cn('w-2 h-2 rounded-full shrink-0', className)}
        style={{ backgroundColor: label.color }}
      />
    )
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none', className)}
      style={{ backgroundColor: `${label.color}22`, color: label.color, borderColor: `${label.color}44`, border: '1px solid' }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
      {label.name}
    </span>
  )
}
