import type { PostType, PostStatus } from '../types'

export function postTypeLabel(type: PostType): string {
  const map: Record<PostType, string> = { foto: 'Foto', video: 'Video', reel: 'Reel', story: 'Story', carousel: 'Carousel' }
  return map[type]
}

export function postStatusLabel(status: string): string {
  const map: Record<string, string> = {
    todo: 'Te doen',
    in_progress: 'Bezig',
    feedback: 'Klaar voor feedback',
    posted: 'Gepost',
    // legacy
    planned: 'Te doen',
  }
  return map[status] ?? 'Te doen'
}

export const postStatusColor: Record<string, string> = {
  todo:        'bg-zinc-700/60 text-zinc-300 border-zinc-600/50',
  in_progress: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  feedback:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  posted:      'bg-green-500/15 text-green-400 border-green-500/30',
  // legacy
  planned:     'bg-zinc-700/60 text-zinc-300 border-zinc-600/50',
}

export const postStatusDot: Record<string, string> = {
  todo:        'bg-zinc-400',
  in_progress: 'bg-orange-400',
  feedback:    'bg-blue-400',
  posted:      'bg-green-400',
  // legacy
  planned:     'bg-zinc-400',
}

// Chip-kleur voor kalender (bg + tekst + rand)
export const postStatusChipColor: Record<string, { bg: string; text: string; border: string }> = {
  todo:        { bg: 'bg-zinc-700/50',   text: 'text-zinc-300',   border: 'border-zinc-600/50' },
  in_progress: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/35' },
  feedback:    { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/35' },
  posted:      { bg: 'bg-green-500/20',  text: 'text-green-300',  border: 'border-green-500/35' },
  // legacy
  planned:     { bg: 'bg-zinc-700/50',   text: 'text-zinc-300',   border: 'border-zinc-600/50' },
}

// 7 vaste kleuren voor klanten in de kalender
export const CLIENT_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400', border: 'border-purple-500/30' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', dot: 'bg-rose-400', border: 'border-rose-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-300', dot: 'bg-cyan-400', border: 'border-cyan-500/30' },
  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', dot: 'bg-indigo-400', border: 'border-indigo-500/30' },
]

export function clientColor(index: number) {
  return CLIENT_COLORS[index % CLIENT_COLORS.length]
}
