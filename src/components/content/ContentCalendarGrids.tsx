import type { ReactNode } from 'react'
import { format, isSameMonth, isSameDay, isToday } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Post } from '../../types'
import { WEEKDAYS } from './contentConstants'

export function ContentCalendarNav({
  navLabel,
  onPrev,
  onNext,
}: {
  navLabel: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
      <button
        type="button"
        onClick={onPrev}
        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <h2 className="text-sm font-semibold text-text-primary capitalize">
        {navLabel}
      </h2>
      <button
        type="button"
        onClick={onNext}
        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export function ContentWeekdayHeaderRow() {
  return (
    <div className="grid grid-cols-7 border-b border-border-subtle">
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          className="py-2 text-center text-xs font-medium text-text-muted"
        >
          {d}
        </div>
      ))}
    </div>
  )
}

export function ContentMonthGrid({
  calendarDays,
  currentDate,
  selectedDay,
  draggingPostId,
  dragOverDate,
  postsForDay,
  onToggleDay,
  onDropPostOnDate,
  onDragOverDate,
  onDragLeaveCell,
  openNewPost,
  renderPostChip,
}: {
  calendarDays: Date[]
  currentDate: Date
  selectedDay: Date | null
  draggingPostId: string | null
  dragOverDate: string | null
  postsForDay: (day: Date) => Post[]
  onToggleDay: (day: Date) => void
  onDropPostOnDate: (dateStr: string, postIdFromTransfer: string | null) => void
  onDragOverDate: (dateStr: string) => void
  onDragLeaveCell: (e: React.DragEvent, currentTarget: HTMLElement) => void
  openNewPost: (day: Date) => void
  renderPostChip: (post: Post) => ReactNode
}) {
  return (
    <div className="grid grid-cols-7">
      {calendarDays.map((day, i) => {
        const dayPostList = postsForDay(day)
        const inMonth = isSameMonth(day, currentDate)
        const isSelected = selectedDay && isSameDay(day, selectedDay)
        const dateStr = format(day, 'yyyy-MM-dd')
        const isDragTarget = Boolean(draggingPostId && dragOverDate === dateStr)
        return (
          <div
            key={i}
            onClick={() => !draggingPostId && onToggleDay(day)}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              onDragOverDate(dateStr)
            }}
            onDragLeave={(e) => onDragLeaveCell(e, e.currentTarget)}
            onDrop={(e) => {
              e.preventDefault()
              const postId = e.dataTransfer.getData('postId') || draggingPostId
              onDropPostOnDate(dateStr, postId)
            }}
            className={`min-h-[108px] p-2 border-r border-b border-border-subtle/40 transition-colors
              ${isDragTarget ? 'bg-accent-blue/10 border-accent-blue/40' : ''}
              ${isSelected && !draggingPostId ? 'bg-accent-blue/5 border-accent-blue/20' : ''}
              ${!isDragTarget && !isSelected ? 'hover:bg-white/[0.02]' : ''}
              ${!inMonth ? 'opacity-30' : ''}
              ${draggingPostId ? 'cursor-copy' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-accent-blue text-white' : 'text-text-secondary'}`}
              >
                {format(day, 'd')}
              </span>
              {inMonth && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openNewPost(day)
                  }}
                  className="p-0.5 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-colors"
                >
                  <Plus size={11} />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {dayPostList.slice(0, 3).map((post) => (
                <div key={post.id}>{renderPostChip(post)}</div>
              ))}
              {dayPostList.length > 3 && (
                <p className="text-xs text-text-muted pl-1">
                  +{dayPostList.length - 3} meer
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ContentWeekRows({
  weekDays,
  currentDate,
  postsForDay,
  openNewPost,
  renderPostCard,
}: {
  weekDays: Date[]
  currentDate: Date
  postsForDay: (day: Date) => Post[]
  openNewPost: (day: Date) => void
  renderPostCard: (post: Post) => ReactNode
}) {
  return (
    <div className="divide-y divide-border-subtle/40">
      {weekDays.map((day, i) => {
        const dayPostList = postsForDay(day)
        const inCurrentMonth = isSameMonth(day, currentDate)
        return (
          <div
            key={i}
            className={`px-4 py-3 ${!inCurrentMonth ? 'opacity-60' : ''}`}
          >
            <div
              className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${isToday(day) ? 'bg-accent-blue/5' : 'bg-surface-3/40'}`}
            >
              <div className="flex items-baseline gap-2">
                <p
                  className={`text-sm font-semibold capitalize ${isToday(day) ? 'text-accent-blue' : 'text-text-secondary'}`}
                >
                  {format(day, 'EEEE', { locale: nl })}
                </p>
                <p
                  className={`text-sm ${isToday(day) ? 'text-accent-blue' : 'text-text-muted'}`}
                >
                  {format(day, 'd MMMM', { locale: nl })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openNewPost(day)}
                className="p-1 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="space-y-2">
              {dayPostList.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openNewPost(day)}
                  className="w-full text-left rounded-lg border border-dashed border-border-subtle px-3 py-3 text-xs text-text-muted opacity-70 hover:opacity-100 hover:bg-surface-3/60 transition-colors"
                >
                  Geen posts — klik om toe te voegen
                </button>
              ) : (
                dayPostList.map((post) => <div key={post.id}>{renderPostCard(post)}</div>)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
