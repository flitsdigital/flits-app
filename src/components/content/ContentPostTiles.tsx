import type { DragEvent, MouseEvent } from 'react'
import { ExternalLink, Edit2, Trash2, Share2, Check, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Post, PostStatus } from '../../types'
import {
  postStatusDot,
  postStatusColor,
  postStatusChipColor,
  postTypeLabel,
  postStatusLabel,
} from '../../lib/postHelpers'
import { TYPE_ICON, normalizePostStatus } from './contentConstants'

export function ContentPostChip({
  post,
  clientName,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  post: Post
  clientName: string
  isDragging: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onClick: (e: MouseEvent) => void
}) {
  const st = normalizePostStatus(post.status)
  const sc = postStatusChipColor[st] ?? postStatusChipColor.todo
  const Icon = TYPE_ICON[post.type]
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`flex items-start gap-2 px-2 py-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing bg-surface-1/90 ${sc.border} ${isDragging ? 'opacity-30 scale-[0.98]' : 'hover:bg-surface-1 hover:border-border-default'}`}
    >
      <span className={`mt-[3px] w-1.5 h-1.5 rounded-full shrink-0 ${postStatusDot[st]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon size={10} className="shrink-0 text-text-muted" />
          <span className="truncate font-medium text-text-primary text-[11px]">{clientName}</span>
        </div>
        {post.caption && (
          <p className="truncate text-[10px] text-text-muted mt-0.5">{post.caption}</p>
        )}
      </div>
    </div>
  )
}

export function ContentPostCard({
  post,
  clientName,
  compact = false,
  copiedPostId,
  onEdit,
  onCopyPreview,
  onDelete,
}: {
  post: Post
  clientName: string
  compact?: boolean
  copiedPostId: string | null
  onEdit: () => void
  onCopyPreview: () => void
  onDelete: () => void
}) {
  const Icon = TYPE_ICON[post.type]
  const st = normalizePostStatus(post.status)
  const sc = postStatusChipColor[st] ?? postStatusChipColor.todo
  const primaryMediaUrl = post.mediaUrls?.[0] ?? post.mediaUrl
  const mediaCount = post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0)
  const statusBar: Record<PostStatus, string> = {
    todo: 'border-l-zinc-500',
    in_progress: 'border-l-orange-500',
    feedback: 'border-l-blue-500',
    approved: 'border-l-purple-500',
    posted: 'border-l-green-500',
  }
  return (
    <div
      className={`group flex gap-3 p-3 rounded-lg border bg-surface-0 hover:bg-surface-1 transition-all border-l-[3px] ${statusBar[st]} ${sc.border}`}
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-border-subtle bg-surface-2">
        <Icon size={13} className="text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-semibold text-text-primary">
            {clientName}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded border font-medium ${postStatusColor[st]}`}
          >
            {postStatusLabel(st)}
          </span>
          <span className="text-xs text-text-muted">
            {postTypeLabel(post.type)}
          </span>
        </div>
        {post.caption && (
          <p
            className={`text-sm text-text-secondary ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}
          >
            {post.caption}
          </p>
        )}
        {!compact && primaryMediaUrl && (
          <a
            href={primaryMediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1.5"
          >
            <ExternalLink size={11} />{' '}
            {post.type === 'carousel' && mediaCount > 1
              ? `${mediaCount} afbeeldingen`
              : 'Media'}
          </a>
        )}
      </div>
      <div className="shrink-0 self-start mt-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted opacity-0 group-hover:opacity-100">
              <MoreHorizontal size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 size={12} className="mr-2" /> Bewerken
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyPreview}>
              {copiedPostId === post.id ? <Check size={12} className="mr-2" /> : <Share2 size={12} className="mr-2" />}
              {copiedPostId === post.id ? 'Gekopieerd!' : 'Preview link'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 size={12} className="mr-2" /> Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
