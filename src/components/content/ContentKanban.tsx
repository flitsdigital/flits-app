import { useState, useMemo, useCallback } from 'react'
import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Post, PostStatus } from '../../types'
import { postStatusChipColor, postTypeLabel } from '../../lib/postHelpers'
import { TYPE_ICON, POST_KANBAN_COLS, normalizePostStatus } from './contentConstants'

function PostKanbanCard({
  post,
  clientName,
  onClick,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  post: Post
  clientName: string
  onClick: () => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const Icon = TYPE_ICON[post.type]
  const st = normalizePostStatus(post.status)
  const sc = postStatusChipColor[st] ?? postStatusChipColor.todo
  const bar: Record<PostStatus, string> = {
    todo: 'border-l-zinc-500',
    in_progress: 'border-l-orange-500',
    feedback: 'border-l-blue-500',
    approved: 'border-l-purple-500',
    posted: 'border-l-green-500',
  }
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        'bg-surface-0 border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-zinc-500 hover:shadow-lg hover:shadow-black/20 transition-all group select-none border-l-[3px]',
        bar[st],
        sc.border,
        isDragging && 'opacity-40 scale-[0.98]',
      )}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-border-subtle bg-surface-2">
          <Icon size={13} className="text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary leading-snug group-hover:text-white transition-colors truncate">{clientName}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{postTypeLabel(post.type)}</p>
        </div>
      </div>
      {post.caption && <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{post.caption}</p>}
      {post.date && <p className="text-[10px] text-text-muted mt-1.5">{format(parseISO(post.date), 'EEE d MMM', { locale: nl })}</p>}
    </div>
  )
}

export function ContentKanbanBoard({
  posts,
  clientMap,
  onPostClick,
  onStatusChange,
}: {
  posts: Post[]
  clientMap: Record<string, string>
  onPostClick: (post: Post) => void
  onStatusChange: (postId: string, status: PostStatus) => void | Promise<void>
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<PostStatus | null>(null)

  const byStatus = useMemo(() => {
    const map: Record<PostStatus, Post[]> = { todo: [], in_progress: [], feedback: [], approved: [], posted: [] }
    for (const p of posts) {
      const st = normalizePostStatus(p.status)
      ;(map[st] ?? map.todo).push(p)
    }
    ;(Object.keys(map) as PostStatus[]).forEach((k) => {
      map[k].sort((a, b) => {
        const da = a.date ?? ''
        const db = b.date ?? ''
        if (da !== db) return da.localeCompare(db)
        return (clientMap[a.clientId] ?? '').localeCompare(clientMap[b.clientId] ?? '')
      })
    })
    return map
  }, [posts, clientMap])

  const handleDragOver = useCallback((e: React.DragEvent, status: PostStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, status: PostStatus) => {
      e.preventDefault()
      if (draggedId) {
        const post = posts.find((p) => p.id === draggedId)
        if (post && normalizePostStatus(post.status) !== status) {
          void onStatusChange(draggedId, status)
        }
      }
      setDraggedId(null)
      setDragOverStatus(null)
    },
    [draggedId, posts, onStatusChange],
  )

  return (
    <div className="flex gap-3 h-full min-h-[420px] overflow-x-auto pb-4 snap-x snap-mandatory">
      {POST_KANBAN_COLS.map(({ id, label, Icon, bg, headerBg, ring, text }) => {
        const colPosts = byStatus[id]
        const isOver = dragOverStatus === id
        const isDragSource = draggedId !== null && colPosts.some((p) => p.id === draggedId)
        return (
          <div
            key={id}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, id)}
            className={clsx(
              'flex flex-col w-[272px] shrink-0 snap-start rounded-xl overflow-hidden border transition-all duration-150',
              bg,
              isOver
                ? 'border-accent-blue/60 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]'
                : isDragSource
                  ? 'border-zinc-700'
                  : 'border-border-subtle',
            )}
          >
            <div className={clsx('flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle', headerBg)}>
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={text} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', text)}>{label}</span>
              <span
                className={clsx(
                  'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full',
                  colPosts.length > 0 ? `${text} bg-white/[0.08]` : 'text-text-muted',
                )}
              >
                {colPosts.length}
              </span>
            </div>

            <div
              className={clsx(
                'flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150 min-h-[120px]',
                isOver && colPosts.length === 0 && 'bg-accent-blue/[0.06]',
              )}
            >
              {colPosts.map((post) => (
                <PostKanbanCard
                  key={post.id}
                  post={post}
                  clientName={clientMap[post.clientId] ?? '?'}
                  onClick={() => {
                    if (!draggedId) onPostClick(post)
                  }}
                  isDragging={draggedId === post.id}
                  onDragStart={() => setDraggedId(post.id)}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDragOverStatus(null)
                  }}
                />
              ))}

              {isOver && draggedId && !colPosts.some((p) => p.id === draggedId) && (
                <div className="border-2 border-dashed border-accent-blue/40 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-accent-blue/60">Hier neerzetten</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
