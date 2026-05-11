import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const DEFAULT_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#64748b', '#6b7280',
]

interface Props {
  value: string
  onChange: (color: string) => void
  colors?: string[]
  className?: string
}

export function ColorPicker({ value, onChange, colors = DEFAULT_COLORS, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ring-offset-surface-2 focus:ring-2 focus:ring-accent-blue/50"
          style={{ backgroundColor: c }}
          title={c}
        >
          {value === c && <Check size={12} className="text-white drop-shadow" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

export { DEFAULT_COLORS }
