import type { ElementType } from 'react'
import {
  Image,
  Video,
  Film,
  Square,
  Layers,
  Circle,
  CircleDot,
  MessageSquare,
  CheckCheck,
  CheckCircle2,
} from 'lucide-react'
import type { PostType, PostStatus } from '../../types'

export const TYPE_ICON: Record<PostType, ElementType> = {
  foto: Image,
  video: Video,
  reel: Film,
  story: Square,
  carousel: Layers,
}

export const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

export type ContentViewMode = 'month' | 'week' | 'list' | 'kanban'

/** Legacy DB value `planned` is treated as todo. */
export function normalizePostStatus(status: string): PostStatus {
  if (status === 'planned') return 'todo'
  return status as PostStatus
}

export const POST_KANBAN_COLS: {
  id: PostStatus
  label: string
  Icon: ElementType
  bg: string
  headerBg: string
  ring: string
  text: string
}[] = [
  { id: 'todo', label: 'Te doen', Icon: Circle, bg: 'bg-zinc-500/[0.06]', headerBg: 'bg-zinc-500/10', ring: 'bg-zinc-400', text: 'text-zinc-400' },
  { id: 'in_progress', label: 'Bezig', Icon: CircleDot, bg: 'bg-orange-500/[0.06]', headerBg: 'bg-orange-500/10', ring: 'bg-orange-400', text: 'text-orange-400' },
  { id: 'feedback', label: 'Feedback', Icon: MessageSquare, bg: 'bg-blue-500/[0.06]', headerBg: 'bg-blue-500/10', ring: 'bg-blue-400', text: 'text-blue-400' },
  { id: 'approved', label: 'Goedgekeurd', Icon: CheckCheck, bg: 'bg-purple-500/[0.06]', headerBg: 'bg-purple-500/10', ring: 'bg-purple-400', text: 'text-purple-400' },
  { id: 'posted', label: 'Gepost', Icon: CheckCircle2, bg: 'bg-green-500/[0.05]', headerBg: 'bg-green-500/10', ring: 'bg-green-400', text: 'text-green-400' },
]
