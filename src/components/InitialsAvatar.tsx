import { cn } from '@/lib/utils'

// Consistent set of muted colors for initials avatars
const PALETTE = [
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-green-500/20 text-green-300',
  'bg-orange-500/20 text-orange-300',
  'bg-pink-500/20 text-pink-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-yellow-500/20 text-yellow-300',
  'bg-red-500/20 text-red-300',
]

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface InitialsAvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  /** Overschrijf de automatische kleur */
  colorClass?: string
}

const SIZE_MAP = {
  xs: { wrapper: 'w-5 h-5', text: 'text-[9px]' },
  sm: { wrapper: 'w-6 h-6', text: 'text-[10px]' },
  md: { wrapper: 'w-8 h-8', text: 'text-xs' },
  lg: { wrapper: 'w-10 h-10', text: 'text-sm' },
}

export function InitialsAvatar({ name, size = 'sm', className, colorClass }: InitialsAvatarProps) {
  const { wrapper, text } = SIZE_MAP[size]
  const color = colorClass ?? colorForName(name)
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

  return (
    <div className={cn('rounded-md flex items-center justify-center shrink-0 font-semibold', wrapper, color, className)}>
      <span className={text}>{initials}</span>
    </div>
  )
}
