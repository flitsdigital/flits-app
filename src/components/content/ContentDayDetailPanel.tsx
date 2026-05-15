import { format } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import { Plus } from 'lucide-react'
import type { Post } from '../../types'
import { ContentPostCard } from './ContentPostTiles'

export function ContentDayDetailPanel({
  selectedDay,
  dayPosts,
  clientMap,
  copiedPostId,
  onAddPost,
  onEditPost,
  onCopyPreview,
  onDeletePost,
}: {
  selectedDay: Date
  dayPosts: Post[]
  clientMap: Record<string, string>
  copiedPostId: string | null
  onAddPost: (day: Date) => void
  onEditPost: (post: Post) => void
  onCopyPreview: (postId: string) => void
  onDeletePost: (post: Post) => void
}) {
  return (
    <div className="mt-4 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
        <h3 className="text-sm font-medium text-text-primary capitalize">
          {format(selectedDay, 'EEEE d MMMM', { locale: nl })}
          <span className="text-text-muted font-normal ml-2">
            — {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => onAddPost(selectedDay)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-3 hover:bg-surface-4 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-medium rounded transition-colors"
        >
          <Plus size={12} /> Toevoegen
        </button>
      </div>
      {dayPosts.length === 0 ? (
        <div className="px-4 py-6 text-xs text-text-muted text-center">
          Geen posts op deze dag.
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
          {dayPosts.map((post) => (
            <ContentPostCard
              key={post.id}
              post={post}
              clientName={clientMap[post.clientId] ?? '?'}
              copiedPostId={copiedPostId}
              onEdit={() => onEditPost(post)}
              onCopyPreview={() => onCopyPreview(post.id)}
              onDelete={() => onDeletePost(post)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
