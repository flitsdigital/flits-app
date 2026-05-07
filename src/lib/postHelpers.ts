import type { PostType, PostStatus } from '../types'

export function postTypeLabel(type: PostType): string {
  const map: Record<PostType, string> = { foto: 'Foto', video: 'Video', reel: 'Reel', story: 'Story', carousel: 'Carousel' }
  return map[type]
}

export function postStatusLabel(status: PostStatus): string {
  const map: Record<PostStatus, string> = { todo: 'Te doen', planned: 'Gepland', posted: 'Gepost' }
  return map[status]
}

export const postStatusColor: Record<PostStatus, string> = {
  todo: 'bg-zinc-700/60 text-zinc-300 border-zinc-600/50',
  planned: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  posted: 'bg-green-500/15 text-green-400 border-green-500/30',
}

export const postStatusDot: Record<PostStatus, string> = {
  todo: 'bg-zinc-400',
  planned: 'bg-blue-400',
  posted: 'bg-green-400',
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
