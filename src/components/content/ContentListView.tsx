import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { Post } from '../../types'
import { TYPE_ICON, normalizePostStatus } from './contentConstants'
import {
  postStatusChipColor,
  postTypeLabel,
  postStatusLabel,
  postStatusColor,
} from '../../lib/postHelpers'

export function ContentListView({
  weekTodosOnly,
  postsForCalendar,
  filteredPosts,
  selectedPostIds,
  setSelectedPostIds,
  clientMap,
  onOpenPost,
}: {
  weekTodosOnly: boolean
  postsForCalendar: Post[]
  filteredPosts: Post[]
  selectedPostIds: Set<string>
  setSelectedPostIds: Dispatch<SetStateAction<Set<string>>>
  clientMap: Record<string, string>
  onOpenPost: (post: Post) => void
}) {
  const listSource = weekTodosOnly ? postsForCalendar : filteredPosts
  const sorted = [...listSource].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })

  const allIds = sorted.map((p) => p.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedPostIds.has(id))
  const someSelected = allIds.some((id) => selectedPostIds.has(id)) && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelectedPostIds(new Set())
    } else {
      setSelectedPostIds(new Set(allIds))
    }
  }

  function toggleOne(id: string, e: MouseEvent) {
    e.stopPropagation()
    setSelectedPostIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const groups: { label: string; date: string | null; posts: typeof sorted }[] = []
  for (const post of sorted) {
    const key = post.date ?? '__no_date__'
    const last = groups[groups.length - 1]
    if (last?.date === key) {
      last.posts.push(post)
    } else {
      groups.push({
        label: post.date ? format(parseISO(post.date), 'EEEE d MMMM yyyy', { locale: nl }) : 'Geen datum',
        date: key,
        posts: [post],
      })
    }
  }

  const COLS = 'grid-cols-[20px_44px_1fr_160px_100px_140px]'

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">

      <div className={`hidden lg:grid ${COLS} gap-3 items-center px-4 py-2.5 border-b border-border-subtle bg-surface-1/60 sticky top-0 z-10`}>
        <div onClick={toggleAll} className="flex items-center justify-center cursor-pointer">
          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-accent-blue border-accent-blue' : someSelected ? 'bg-accent-blue/50 border-accent-blue' : 'border-zinc-600 hover:border-zinc-400'}`}>
            {(allSelected || someSelected) && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
        </div>
        <div />
        <span className="text-xs font-medium text-text-muted">Post</span>
        <span className="text-xs font-medium text-text-muted">Klant</span>
        <span className="text-xs font-medium text-text-muted">Type</span>
        <span className="text-xs font-medium text-text-muted">Status</span>
      </div>

      {sorted.length === 0 && (
        <div className="px-4 py-10 text-xs text-text-muted text-center">Geen posts gevonden.</div>
      )}

      {groups.map((group) => (
        <div key={group.date ?? 'none'}>
          <div className="px-4 py-2 bg-surface-1/20 border-b border-t border-border-subtle/40">
            <span className={`text-xs font-semibold capitalize ${group.date && group.date !== '__no_date__' && isToday(parseISO(group.date)) ? 'text-accent-blue' : 'text-text-muted'}`}>
              {group.label}
              {group.date && group.date !== '__no_date__' && isToday(parseISO(group.date)) && <span className="ml-2 font-normal opacity-60">— vandaag</span>}
            </span>
          </div>

          {group.posts.map((post) => {
            const st = normalizePostStatus(post.status)
            const sc = postStatusChipColor[st] ?? postStatusChipColor.todo
            const Icon = TYPE_ICON[post.type]
            const clientName = clientMap[post.clientId] ?? '?'
            const thumb = post.mediaUrls?.[0] ?? post.mediaUrl
            const isSelected = selectedPostIds.has(post.id)
            return (
              <div key={post.id}>
                <div
                  onClick={() => onOpenPost(post)}
                  className={`hidden lg:grid ${COLS} gap-3 items-center px-4 py-2.5 border-b border-border-subtle/30 cursor-pointer transition-colors group ${isSelected ? 'bg-accent-blue/[0.06]' : 'hover:bg-white/[0.025]'}`}
                >
                  <div
                    onClick={(e) => toggleOne(post.id, e)}
                    className="flex items-center justify-center"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-blue border-accent-blue' : 'border-zinc-600 opacity-0 group-hover:opacity-100 hover:border-zinc-400'}`}>
                      {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </div>

                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-3 border border-border-subtle shrink-0 flex items-center justify-center">
                    {thumb
                      ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                      : <Icon size={13} className="text-text-muted" />}
                  </div>

                  <p className="text-sm text-text-primary truncate">
                    {post.caption || <span className="text-text-muted italic text-xs">Geen caption</span>}
                  </p>

                  <span className={`text-xs font-medium truncate ${sc.text}`}>{clientName}</span>

                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Icon size={12} className="shrink-0" />
                    {postTypeLabel(post.type)}
                  </div>

                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border w-fit ${postStatusColor[st]}`}>
                    {postStatusLabel(st)}
                  </span>
                </div>

                <div
                  onClick={() => onOpenPost(post)}
                  className={`lg:hidden flex items-start gap-3 px-4 py-3 border-b border-border-subtle/30 cursor-pointer transition-colors ${isSelected ? 'bg-accent-blue/[0.06]' : 'hover:bg-white/[0.025]'}`}
                >
                  <button
                    type="button"
                    onClick={(e) => toggleOne(post.id, e)}
                    className="flex items-center justify-center mt-1 shrink-0"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-blue border-accent-blue' : 'border-zinc-600 hover:border-zinc-400'}`}>
                      {isSelected && <svg width="9" height="9" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </button>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-3 border border-border-subtle shrink-0 flex items-center justify-center">
                    {thumb
                      ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                      : <Icon size={14} className="text-text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium ${sc.text} truncate max-w-[160px]`}>{clientName}</span>
                      <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${postStatusColor[st]}`}>
                        {postStatusLabel(st)}
                      </span>
                      <span className="text-[10px] text-text-muted inline-flex items-center gap-1">
                        <Icon size={10} />
                        {postTypeLabel(post.type)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary line-clamp-2">
                      {post.caption || <span className="text-text-muted italic text-xs">Geen caption</span>}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
