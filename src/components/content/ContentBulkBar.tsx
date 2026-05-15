import { X } from 'lucide-react'
import { postStatusDot, postStatusLabel } from '../../lib/postHelpers'
import type { PostStatus } from '../../types'

export function ContentBulkSelectionBar({
  count,
  bulkStatusOpen,
  onToggleBulkStatusOpen,
  onBulkSetStatus,
  onBulkDelete,
  onClearSelection,
}: {
  count: number
  bulkStatusOpen: boolean
  onToggleBulkStatusOpen: () => void
  onBulkSetStatus: (status: PostStatus) => void | Promise<void>
  onBulkDelete: () => void | Promise<void>
  onClearSelection: () => void
}) {
  if (count <= 0) return null
  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/40 max-w-[95vw]">
      <span className="text-sm font-medium text-white pl-1">
        {count} geselecteerd
      </span>

      <div className="w-px h-4 bg-zinc-700" />

      <div className="relative">
        <button
          type="button"
          onClick={onToggleBulkStatusOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
        >
          Status wijzigen
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {bulkStatusOpen && (
          <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
            {(['todo', 'in_progress', 'feedback', 'approved', 'posted'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void onBulkSetStatus(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full ${postStatusDot[s]}`} />
                {postStatusLabel(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void onBulkDelete()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
        Verwijderen
      </button>

      <div className="w-px h-4 bg-zinc-700" />

      <button
        type="button"
        onClick={onClearSelection}
        className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
