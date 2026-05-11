import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface AvatarProfile {
  name?: string | null
  email: string
  avatar_url?: string | null
}

interface Props {
  profile: AvatarProfile | null | undefined
  /** Tailwind size classes, e.g. 'w-6 h-6'. Default: 'w-6 h-6' */
  size?: string
  /** Extra classes on the Avatar root */
  className?: string
  /** Font size class for the fallback initials. Default: 'text-[10px]' */
  textSize?: string
}

function getInitials(profile: AvatarProfile): string {
  const src = profile.name?.trim() || profile.email.split('@')[0]
  return src
    .split(/[\s._\-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UserAvatar({ profile, size = 'w-6 h-6', className, textSize = 'text-[10px]' }: Props) {
  const initials = profile ? getInitials(profile) : '?'

  return (
    <Avatar className={cn(size, className)}>
      <AvatarImage
        src={profile?.avatar_url ?? undefined}
        className="object-cover"
      />
      <AvatarFallback
        className={cn(
          'bg-surface-4 text-text-secondary border border-border-default font-semibold leading-none',
          textSize,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
