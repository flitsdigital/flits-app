import { useState, useEffect, useRef } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { TimeEntry, TimeTag } from '../../types'
import { HOUR_PX, SLOT_MINS, SLOT_PX } from './timeTrackingConstants'
import {
  snapMins,
  clampMins,
  yToMins,
  minsToY,
  minsToTimeStr,
  entriesForDate,
  getDurationSeconds,
  formatHoursShort,
  layoutDayEntries,
  entryStartMins,
  entryEndMins,
} from './timeTrackingHelpers'

interface DragPreview {
  dayIndex: number
  topPx: number
  heightPx: number
}

export function WeekCalendarGrid({
  days,
  entries,
  now,
  tagMap,
  clientMap,
  onEdit,
  onCreateFromDrag,
  onResize,
  pendingSlot,
}: {
  days: Date[]
  entries: TimeEntry[]
  now: number
  tagMap: Record<string, TimeTag>
  clientMap: Record<string, string>
  onEdit: (entry: TimeEntry) => void
  onCreateFromDrag: (day: Date, startMins: number, endMins: number) => void
  onResize: (entry: TimeEntry, newStartMins: number, newEndMins: number) => void
  pendingSlot?: { date: string; startMins: number; endMins: number }
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))

  const dragRef = useRef<{ dayIndex: number; day: Date; startMin: number; curMin: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)

  const resizeRef = useRef<{ entry: TimeEntry; dayIndex: number; type: 'top' | 'bottom' } | null>(null)
  const [resizePreview, setResizePreview] = useState<{
    entryId: string
    startMin: number
    endMin: number
  } | null>(null)

  useEffect(() => {
    const d = new Date()
    const minsNow = d.getHours() * 60 + d.getMinutes()
    const scrollTo = Math.max(0, minsToY(minsNow) - 200)
    scrollRef.current?.scrollTo({ top: scrollTo, behavior: 'instant' })
  }, [])

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const nowDate = new Date(now)

  function computePreview(startMin: number, curMin: number, dayIndex: number): DragPreview {
    const lo = Math.min(startMin, curMin)
    const hi = Math.max(startMin, curMin) + SLOT_MINS
    return { dayIndex, topPx: minsToY(lo), heightPx: Math.max(minsToY(hi) - minsToY(lo), SLOT_PX) }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, dayIndex: number, day: Date) {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-entry-block="true"]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    const startMin = yToMins(e.clientY - rect.top)
    dragRef.current = { dayIndex, day, startMin, curMin: startMin }
    setDragPreview(computePreview(startMin, startMin, dayIndex))
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>, dayIndex: number) {
    if (!dragRef.current || dragRef.current.dayIndex !== dayIndex) return
    const rect = e.currentTarget.getBoundingClientRect()
    const curMin = yToMins(e.clientY - rect.top)
    dragRef.current.curMin = curMin
    setDragPreview(computePreview(dragRef.current.startMin, curMin, dayIndex))
  }

  function handlePointerUp(dayIndex: number) {
    if (!dragRef.current || dragRef.current.dayIndex !== dayIndex) return
    const { day, startMin, curMin } = dragRef.current
    const lo = Math.min(startMin, curMin)
    const hi = Math.max(startMin, curMin) + SLOT_MINS
    dragRef.current = null
    setDragPreview(null)
    onCreateFromDrag(day, lo, hi)
  }

  function handlePointerCancel() {
    dragRef.current = null
    setDragPreview(null)
  }

  function yToMinsFromCol(clientY: number, dayIndex: number): number {
    const colEl = colRefs.current[dayIndex]
    if (!colEl) return 0
    const rect = colEl.getBoundingClientRect()
    return snapMins(clampMins(((clientY - rect.top) / HOUR_PX) * 60))
  }

  function handleBottomResizeStart(e: React.PointerEvent<HTMLDivElement>, entry: TimeEntry, dayIndex: number) {
    e.stopPropagation()
    e.preventDefault()
    const origStart = entryStartMins(entry)
    const origEnd = Math.min(entryEndMins(entry, now), 24 * 60)
    resizeRef.current = { entry, dayIndex, type: 'bottom' }
    setResizePreview({ entryId: entry.id, startMin: origStart, endMin: origEnd })

    function onMove(ev: PointerEvent) {
      if (!resizeRef.current) return
      const newEnd = Math.max(origStart + SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      setResizePreview({ entryId: entry.id, startMin: origStart, endMin: newEnd })
    }
    function onUp(ev: PointerEvent) {
      const newEnd = Math.max(origStart + SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      onResize(entry, origStart, newEnd)
      resizeRef.current = null
      setResizePreview(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  function handleTopResizeStart(e: React.PointerEvent<HTMLDivElement>, entry: TimeEntry, dayIndex: number) {
    e.stopPropagation()
    e.preventDefault()
    const origStart = entryStartMins(entry)
    const origEnd = Math.min(entryEndMins(entry, now), 24 * 60)
    resizeRef.current = { entry, dayIndex, type: 'top' }
    setResizePreview({ entryId: entry.id, startMin: origStart, endMin: origEnd })

    function onMove(ev: PointerEvent) {
      if (!resizeRef.current) return
      const newStart = Math.min(origEnd - SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      setResizePreview({ entryId: entry.id, startMin: newStart, endMin: origEnd })
    }
    function onUp(ev: PointerEvent) {
      const newStart = Math.min(origEnd - SLOT_MINS, yToMinsFromCol(ev.clientY, dayIndex))
      onResize(entry, newStart, origEnd)
      resizeRef.current = null
      setResizePreview(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 282px)', minHeight: '400px' }}
    >
      <div className="flex border-b border-border-subtle shrink-0 bg-surface-2 z-10">
        <div className="w-14 shrink-0 border-r border-border-subtle" />
        {days.map((day, i) => {
          const today_ = isToday(day)
          const dayEntries = entriesForDate(entries, day)
          const totalSecs = dayEntries.reduce((s, e) => s + getDurationSeconds(e, now), 0)
          return (
            <div
              key={i}
              className={cn('flex-1 px-2 py-2 text-center border-l border-border-subtle', today_ && 'bg-accent-blue/[0.06]')}
            >
              <p className={cn('text-[10px] font-medium uppercase tracking-wider', today_ ? 'text-accent-blue' : 'text-text-muted')}>
                {format(day, 'EEE', { locale: nl })}
              </p>
              <p className={cn('text-base font-bold leading-none mt-0.5', today_ ? 'text-accent-blue' : 'text-text-primary')}>
                {format(day, 'd')}
              </p>
              {totalSecs > 0 && <p className="text-[10px] text-text-muted tabular-nums mt-0.5">{formatHoursShort(totalSecs)}</p>}
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ userSelect: 'none' }}>
        <div className="flex" style={{ height: HOUR_PX * 24 }}>
          <div className="w-14 shrink-0 relative border-r border-border-subtle bg-surface-2">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-text-muted/50 tabular-nums leading-none pointer-events-none"
                style={{ top: h * HOUR_PX - 6 }}
              >
                {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const dayEntries = entriesForDate(entries, day)
            const today_ = isToday(day)
            const currentMins = today_ ? nowDate.getHours() * 60 + nowDate.getMinutes() : -1
            const dayStr = format(day, 'yyyy-MM-dd')
            const pending = pendingSlot?.date === dayStr ? pendingSlot : null

            return (
              <div
                key={dayIndex}
                ref={(el) => {
                  colRefs.current[dayIndex] = el
                }}
                className={cn('flex-1 relative border-l border-border-subtle cursor-crosshair', today_ && 'bg-accent-blue/[0.015]')}
                style={{ height: HOUR_PX * 24 }}
                onPointerDown={(e) => handlePointerDown(e, dayIndex, day)}
                onPointerMove={(e) => handlePointerMove(e, dayIndex)}
                onPointerUp={() => handlePointerUp(dayIndex)}
                onPointerCancel={handlePointerCancel}
              >
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border-subtle/40 pointer-events-none" style={{ top: h * HOUR_PX }} />
                ))}
                {hours.map((h) => (
                  <div
                    key={`${h}-30`}
                    className="absolute left-0 right-0 border-t border-border-subtle/20 pointer-events-none"
                    style={{ top: h * HOUR_PX + HOUR_PX / 2 }}
                  />
                ))}

                {currentMins >= 0 && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: minsToY(currentMins) }}>
                    <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 shrink-0" />
                    <div className="flex-1 h-px bg-red-400" />
                  </div>
                )}

                {layoutDayEntries(dayEntries, now).map(({ entry, col, totalCols }) => {
                  const isResizing = resizePreview?.entryId === entry.id
                  const startMin = isResizing ? resizePreview!.startMin : entryStartMins(entry)
                  const endMin = isResizing ? resizePreview!.endMin : Math.min(entryEndMins(entry, now), 24 * 60)
                  const topPx = minsToY(startMin)
                  const heightPx = Math.max(minsToY(Math.max(endMin, startMin + SLOT_MINS)) - topPx, SLOT_PX)
                  const firstTag = entry.tagIds.map((id) => tagMap[id]).find(Boolean)
                  const color = entry.isRunning ? '#22c55e' : firstTag?.color ?? '#6366f1'
                  const GAP = 2
                  const leftPct = (col / totalCols) * 100
                  const widthPct = (1 / totalCols) * 100

                  return (
                    <div
                      key={entry.id}
                      data-entry-block="true"
                      className={cn('group/entry absolute rounded px-1.5 py-1 cursor-pointer z-10 select-none overflow-hidden', isResizing && 'opacity-75')}
                      style={{
                        top: topPx + 1,
                        height: heightPx - 2,
                        left: `calc(${leftPct}% + ${col === 0 ? 2 : GAP}px)`,
                        width: `calc(${widthPct}% - ${col === 0 ? GAP + 2 : GAP * 2}px)`,
                        backgroundColor: color + '20',
                        borderLeft: `3px solid ${color}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isResizing) onEdit(entry)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-2.5 cursor-n-resize flex items-start justify-center pt-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity z-10"
                        onPointerDown={(e) => handleTopResizeStart(e, entry, dayIndex)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-5 h-[3px] rounded-full" style={{ backgroundColor: color + 'cc' }} />
                      </div>

                      <p className="text-[11px] font-semibold leading-tight truncate mt-1" style={{ color }}>
                        {entry.isRunning && '● '}
                        {entry.description || 'Geen omschrijving'}
                      </p>
                      {heightPx > 28 && (
                        <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: color + 'bb' }}>
                          {isResizing ? minsToTimeStr(startMin) : format(parseISO(entry.startedAt), 'HH:mm')}
                          {' – '}
                          {isResizing ? minsToTimeStr(endMin) : entry.endedAt ? format(parseISO(entry.endedAt), 'HH:mm') : '…'}
                        </p>
                      )}
                      {heightPx > 48 && entry.clientId && clientMap[entry.clientId] && (
                        <p className="text-[10px] leading-tight truncate mt-0.5 opacity-70" style={{ color }}>
                          {clientMap[entry.clientId]}
                        </p>
                      )}

                      <div
                        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize flex items-end justify-center pb-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity z-10"
                        onPointerDown={(e) => handleBottomResizeStart(e, entry, dayIndex)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-5 h-[3px] rounded-full" style={{ backgroundColor: color + 'cc' }} />
                      </div>
                    </div>
                  )
                })}

                {dragPreview?.dayIndex === dayIndex && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded border border-dashed border-white/30 bg-white/[0.06] z-30 pointer-events-none"
                    style={{ top: dragPreview.topPx, height: dragPreview.heightPx }}
                  >
                    <p className="text-[10px] text-text-muted/80 px-1.5 pt-1 font-medium tabular-nums">
                      {minsToTimeStr(Math.min(Math.min(dragRef.current?.startMin ?? 0, dragRef.current?.curMin ?? 0), 23 * 60 + 45))}
                      {' – '}
                      {minsToTimeStr(
                        Math.min(Math.max(dragRef.current?.startMin ?? 0, dragRef.current?.curMin ?? 0) + SLOT_MINS, 23 * 60 + 59),
                      )}
                    </p>
                  </div>
                )}

                {pending && !dragPreview && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded border border-dashed border-white/20 bg-white/[0.03] z-20 pointer-events-none"
                    style={{
                      top: minsToY(pending.startMins) + 1,
                      height: Math.max(minsToY(pending.endMins) - minsToY(pending.startMins), SLOT_PX) - 2,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
