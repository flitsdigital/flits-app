import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  addDays, differenceInDays, startOfDay, parseISO, format,
  startOfWeek, endOfWeek, isToday, addWeeks,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { ZoomIn, ZoomOut, ChevronRight, ChevronDown, Folder, FolderOpen, Layers } from 'lucide-react'
import clsx from 'clsx'
import type { Milestone, Task, TaskStatus, TaskPriority } from '../../types'
import type { Sprint } from '../../lib/projectsDb'

// ── Config ─────────────────────────────────────────────────────────────────────

const DAY_W_MIN     = 6    // px per day (minimum zoom)
const DAY_W_MAX     = 64   // px per day (maximum zoom)
const DAY_W_DEFAULT = 22   // px per day (default)
const SCROLL_STEP   = 1.5  // px per scroll tick (Alt+wheel, small steps)
const BUTTON_STEP   = 8    // px per button click

const ROW_H   = 36
const LABEL_W = 220

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo:        'bg-zinc-500/50 border-zinc-500',
  in_progress: 'bg-blue-500/60 border-blue-500',
  in_review:   'bg-purple-500/60 border-purple-500',
  done:        'bg-green-500/50 border-green-500',
}

const PRIORITY_STRIPE: Record<TaskPriority, string> = {
  low:    '',
  medium: '',
  high:   'border-orange-400',
  urgent: 'border-red-400',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateFromStr(s: string | null | undefined): Date | null {
  if (!s) return null
  try { return startOfDay(parseISO(s)) } catch { return null }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TodayLine({ rangeStart, totalDays, dayW }: { rangeStart: Date; totalDays: number; dayW: number }) {
  const today = startOfDay(new Date())
  const offset = differenceInDays(today, rangeStart)
  if (offset < 0 || offset > totalDays) return null
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10 pointer-events-none"
      style={{ left: offset * dayW + dayW / 2 }}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  tasks: Task[]
  sprints: Sprint[]
  milestones?: Milestone[]
  projectStartDate?: string | null
  projectDeadline?: string | null
  onTaskClick: (task: Task) => void
  onMilestoneClick?: (m: Milestone) => void
}

export function GanttView({ tasks, sprints, milestones = [], projectStartDate, projectDeadline, onTaskClick, onMilestoneClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dayW, setDayW] = useState(DAY_W_DEFAULT)
  const DAY_W = dayW

  const clampZoom = useCallback((v: number) =>
    Math.min(DAY_W_MAX, Math.max(DAY_W_MIN, v)), [])

  // Alt + scroll → zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.altKey) return
      e.preventDefault()
      setDayW(prev => clampZoom(prev - e.deltaY * SCROLL_STEP * 0.05))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [clampZoom])

  // ── Compute date range ──────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const dates: Date[] = []

    // project bounds
    if (projectStartDate) dates.push(dateFromStr(projectStartDate)!)
    if (projectDeadline)  dates.push(dateFromStr(projectDeadline)!)

    // task due dates + start dates
    tasks.forEach(t => {
      if (t.dueDate)   dates.push(dateFromStr(t.dueDate)!)
      if (t.startDate) dates.push(dateFromStr(t.startDate)!)
      else             dates.push(startOfDay(parseISO(t.createdAt)))
    })

    // milestone deadlines
    milestones.forEach(m => {
      if (m.deadline) dates.push(dateFromStr(m.deadline)!)
    })

    // sprint dates
    sprints.forEach(s => {
      if (s.startDate) dates.push(dateFromStr(s.startDate)!)
      if (s.endDate)   dates.push(dateFromStr(s.endDate)!)
    })

    // always include today
    dates.push(startOfDay(new Date()))

    const earliest = dates.reduce((a, b) => a < b ? a : b)
    const latest   = dates.reduce((a, b) => a > b ? a : b)

    // pad 1 week each side
    const start = startOfWeek(addDays(earliest, -7), { weekStartsOn: 1 })
    const end   = endOfWeek(addDays(latest, 14),    { weekStartsOn: 1 })
    const total = differenceInDays(end, start) + 1

    return { rangeStart: start, rangeEnd: end, totalDays: total }
  }, [tasks, sprints, milestones, projectStartDate, projectDeadline])

  // Build week/day headers
  const weeks = useMemo(() => {
    const result: { label: string; days: Date[] }[] = []
    let cur = rangeStart
    while (cur <= rangeEnd) {
      const weekDays: Date[] = []
      for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(cur, i))
      }
      result.push({ label: format(cur, 'wo MMM', { locale: nl }), days: weekDays })
      cur = addWeeks(cur, 1)
    }
    return result
  }, [rangeStart, rangeEnd])

  // ── Task bar positioning ────────────────────────────────────────────────────
  function taskBar(task: Task): { left: number; width: number } | null {
    // Determine start: task.startDate > sprint.startDate > task.createdAt
    let barStart: Date
    if (task.startDate) {
      barStart = dateFromStr(task.startDate)!
    } else if (task.sprintId) {
      const sprint = sprints.find(s => s.id === task.sprintId)
      barStart = sprint?.startDate ? dateFromStr(sprint.startDate) ?? startOfDay(parseISO(task.createdAt))
                                   : startOfDay(parseISO(task.createdAt))
    } else {
      barStart = startOfDay(parseISO(task.createdAt))
    }

    const barEnd = task.dueDate ? dateFromStr(task.dueDate)! : addDays(barStart, 3)

    const left  = Math.max(0, differenceInDays(barStart, rangeStart)) * DAY_W
    const width = Math.max(DAY_W, differenceInDays(barEnd, barStart) + 1) * DAY_W - 4

    return { left, width }
  }

  // ── Group and sort tasks ────────────────────────────────────────────────────
  const [collapsedMilestones, setCollapsedMilestones] = useState<Set<string>>(new Set())
  const toggleMs = (id: string) => setCollapsedMilestones(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const [flatView, setFlatView] = useState(false)

  type GanttRow = { type: 'milestone'; milestone: Milestone } | { type: 'task'; task: Task }

  const ganttRows = useMemo<GanttRow[]>(() => {
    if (milestones.length === 0 || flatView) {
      return [...tasks]
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
        .map(task => ({ type: 'task' as const, task }))
    }
    const rows: GanttRow[] = []
    const milestoneOrder = [...milestones, null]
    milestoneOrder.forEach(ms => {
      const msTasks = tasks
        .filter(t => (t.milestoneId ?? null) === (ms?.id ?? null))
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      if (msTasks.length === 0 && ms !== null) return
      if (ms) rows.push({ type: 'milestone', milestone: ms })
      const msKey = ms?.id ?? '__none__'
      if (!collapsedMilestones.has(msKey)) {
        msTasks.forEach(task => rows.push({ type: 'task', task }))
      }
    })
    return rows
  }, [tasks, milestones, collapsedMilestones, flatView])

  const gridWidth = totalDays * DAY_W

  return (
    <div className="h-full flex flex-col overflow-hidden select-none">
      {/* Scroll container */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_W + gridWidth }}>

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-20 bg-surface-1 border-b border-border-subtle flex">
            {/* Label column header */}
            <div
              className="shrink-0 flex items-end px-3 pb-1.5 text-xs text-text-muted font-medium border-r border-border-subtle"
              style={{ width: LABEL_W, height: 56 }}
            >
              Taak
            </div>

            {/* Week + day headers */}
            <div className="flex flex-col" style={{ width: gridWidth }}>
              {/* Week row */}
              <div className="flex h-7 border-b border-border-subtle/50">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="shrink-0 flex items-center px-2 text-[10px] text-text-muted border-r border-border-subtle/30"
                    style={{ width: w.days.length * DAY_W }}
                  >
                    {w.label}
                  </div>
                ))}
              </div>
              {/* Day row — hide individual days when too compact */}
              <div className="flex h-7">
                {weeks.flatMap(w => w.days).map((d, i) => {
                  const weekend  = d.getDay() === 0 || d.getDay() === 6
                  const today    = isToday(d)
                  const showDay  = DAY_W >= 22
                  const isMonday = d.getDay() === 1
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'shrink-0 flex items-center justify-center text-[10px] border-r border-border-subtle/20 overflow-hidden',
                        today   ? 'text-red-400 font-semibold' : weekend ? 'text-text-muted/40' : 'text-text-muted',
                      )}
                      style={{ width: DAY_W }}
                    >
                      {showDay ? format(d, 'd') : (isMonday ? format(d, 'd') : '')}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Rows: milestones + tasks ───────────────────────────────── */}
          {ganttRows.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-text-muted">
              Geen taken in dit project
            </div>
          ) : (
            ganttRows.map((row, rowIdx) => {
              const weekend = Array.from({ length: totalDays }, (_, i) => {
                const d = addDays(rangeStart, i)
                return d.getDay() === 0 || d.getDay() === 6
              })

              if (row.type === 'milestone') {
                const ms = row.milestone
                const msKey = ms.id
                const isCollapsed = collapsedMilestones.has(msKey)
                const deadlineOffset = ms.deadline ? differenceInDays(dateFromStr(ms.deadline)!, rangeStart) : null
                const isOverdue = ms.deadline && dateFromStr(ms.deadline)! < startOfDay(new Date())
                return (
                  <div key={`ms-${ms.id}`} className="flex border-b border-border-subtle bg-white/[0.02]" style={{ height: ROW_H }}>
                    {/* Milestone label */}
                    <button
                      className="shrink-0 flex items-center px-3 gap-1.5 border-r border-border-subtle hover:bg-white/[0.04] transition-colors w-full text-left"
                      style={{ width: LABEL_W }}
                      onClick={() => toggleMs(msKey)}
                    >
                      {isCollapsed
                        ? <ChevronRight size={12} className="shrink-0 text-text-muted" />
                        : <ChevronDown size={12} className="shrink-0 text-text-muted" />}
                      {isCollapsed
                        ? <Folder size={13} className="shrink-0" style={{ color: ms.color }} />
                        : <FolderOpen size={13} className="shrink-0" style={{ color: ms.color }} />}
                      <span className="text-xs font-semibold text-text-primary truncate flex-1">{ms.name}</span>
                    </button>
                    {/* Milestone grid: vertical line + diamond at deadline */}
                    <div className="relative flex-1" style={{ width: gridWidth, height: ROW_H }}>
                      {weekend.map((isWe, i) => isWe ? (
                        <div key={i} className="absolute top-0 bottom-0 bg-white/[0.012]" style={{ left: i * DAY_W, width: DAY_W }} />
                      ) : null)}
                      <TodayLine rangeStart={rangeStart} totalDays={totalDays} dayW={DAY_W} />
                      {deadlineOffset !== null && deadlineOffset >= 0 && deadlineOffset <= totalDays && (
                        <>
                          {/* Vertical deadline line */}
                          <div
                            className={clsx('absolute top-0 bottom-0 w-px z-10 pointer-events-none', isOverdue ? 'bg-red-400/60' : 'bg-white/30')}
                            style={{ left: deadlineOffset * DAY_W + DAY_W / 2 }}
                          />
                          {/* Diamond marker */}
                          <div
                            className={clsx('absolute z-20 cursor-pointer transition-opacity hover:opacity-80', isOverdue ? 'text-red-400' : 'text-text-primary')}
                            style={{ left: deadlineOffset * DAY_W + DAY_W / 2 - 7, top: ROW_H / 2 - 7 }}
                            onClick={() => onMilestoneClick?.(ms)}
                            title={ms.name + (ms.deadline ? ' · ' + new Date(ms.deadline + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '')}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                              <polygon points="7,0 14,7 7,14 0,7" />
                            </svg>
                          </div>
                          {/* Label next to diamond */}
                          <div
                            className={clsx('absolute text-[9px] font-medium whitespace-nowrap z-10 pointer-events-none', isOverdue ? 'text-red-400' : 'text-text-muted')}
                            style={{ left: deadlineOffset * DAY_W + DAY_W / 2 + 10, top: ROW_H / 2 - 6 }}
                          >
                            {ms.name}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              }

              const task = row.task
              const bar = taskBar(task)
              return (
                <div
                  key={`task-${task.id}`}
                  className="flex border-b border-border-subtle/30 hover:bg-white/[0.02] group"
                  style={{ height: ROW_H }}
                >
                  {/* Label — indent if under milestone (and not flat view) */}
                  <div
                    className="shrink-0 flex items-center gap-2 border-r border-border-subtle cursor-pointer"
                    style={{ width: LABEL_W, paddingLeft: milestones.length > 0 && !flatView ? 32 : 12, paddingRight: 12 }}
                    onClick={() => onTaskClick(task)}
                  >
                    <span className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      task.status === 'done' ? 'bg-green-400' :
                      task.status === 'in_review' ? 'bg-purple-400' :
                      task.status === 'in_progress' ? 'bg-blue-400' : 'bg-zinc-500'
                    )} />
                    <span className="text-xs text-text-secondary truncate group-hover:text-text-primary transition-colors">
                      {task.title}
                    </span>
                  </div>

                  {/* Grid + bar */}
                  <div className="relative flex-1" style={{ width: gridWidth, height: ROW_H }}>
                    {weekend.map((isWe, i) => isWe ? (
                      <div key={i} className="absolute top-0 bottom-0 bg-white/[0.015]" style={{ left: i * DAY_W, width: DAY_W }} />
                    ) : null)}
                    <TodayLine rangeStart={rangeStart} totalDays={totalDays} dayW={DAY_W} />
                    {bar && (
                      <div
                        className={clsx(
                          'absolute top-[7px] rounded border cursor-pointer transition-opacity hover:opacity-90 flex items-center px-2',
                          STATUS_COLOR[task.status],
                          PRIORITY_STRIPE[task.priority],
                        )}
                        style={{ left: bar.left + 2, width: bar.width, height: ROW_H - 14 }}
                        onClick={() => onTaskClick(task)}
                        title={task.title}
                      >
                        <span className="text-[10px] text-white/80 truncate">{task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Legend + zoom controls */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-2 border-t border-border-subtle text-[10px] text-text-muted">
        {(['todo', 'in_progress', 'in_review', 'done'] as TaskStatus[]).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={clsx('w-3 h-2 rounded-sm border', STATUS_COLOR[s])} />
            {s === 'todo' ? 'Te doen' : s === 'in_progress' ? 'Bezig' : s === 'in_review' ? 'Review' : 'Klaar'}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2">
          <span className="w-px h-3 bg-red-400/70" /> Vandaag
        </span>

        {/* Flat view toggle (only show when there are milestones) */}
        {milestones.length > 0 && (
          <button
            onClick={() => setFlatView(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors',
              flatView
                ? 'bg-white/[0.08] border-white/20 text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            )}
            title={flatView ? 'Groeperen per milestone' : 'Alle taken tonen'}
          >
            <Layers size={10} />
            {flatView ? 'Alle taken' : 'Per milestone'}
          </button>
        )}

        {/* Zoom */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setDayW(v => clampZoom(v - BUTTON_STEP))}
            disabled={dayW <= DAY_W_MIN}
            className="p-1 rounded hover:bg-white/[0.07] disabled:opacity-30 transition-colors"
            title="Uitzoomen (of Alt+scroll)"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] text-text-muted w-8 text-center tabular-nums">
            {Math.round((dayW / DAY_W_DEFAULT) * 100)}%
          </span>
          <button
            onClick={() => setDayW(v => clampZoom(v + BUTTON_STEP))}
            disabled={dayW >= DAY_W_MAX}
            className="p-1 rounded hover:bg-white/[0.07] disabled:opacity-30 transition-colors"
            title="Inzoomen (of Alt+scroll)"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
