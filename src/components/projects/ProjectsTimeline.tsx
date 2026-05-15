import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  addDays, differenceInDays, startOfDay, parseISO, format,
  startOfWeek, endOfWeek, isToday, addWeeks,
} from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import { ZoomIn, ZoomOut, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import clsx from 'clsx'
import type { Project, Milestone, Task, TaskStatus } from '../../types'
import type { Client } from '../../types'
import { projectsDb } from '../../lib/projectsDb'

// ── Config ─────────────────────────────────────────────────────────────────────

const DAY_W_MIN     = 6
const DAY_W_MAX     = 64
const DAY_W_DEFAULT = 22
const SCROLL_STEP   = 1.5
const BUTTON_STEP   = 8

const ROW_H    = 40
const ROW_H_SM = 32   // sub-rows (milestones, tasks)
const LABEL_W  = 220

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo:        'bg-zinc-500/50 border-zinc-500',
  in_progress: 'bg-blue-500/60 border-blue-500',
  in_review:   'bg-purple-500/60 border-purple-500',
  done:        'bg-green-500/50 border-green-500',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateFromStr(s: string | null | undefined): Date | null {
  if (!s) return null
  try { return startOfDay(parseISO(s)) } catch { return null }
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface Props {
  projects: Project[]
  clients: Client[]
  onProjectClick: (project: Project) => void
}

export function ProjectsTimeline({ projects, clients, onProjectClick }: Props) {
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

  // ── Expand state ────────────────────────────────────────────────────────────
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  // Lazily loaded data: projectId → { milestones, tasks }
  const [projectData, setProjectData] = useState<Map<string, { milestones: Milestone[]; tasks: Task[] }>>(new Map())
  const [loadingProjects, setLoadingProjects] = useState<Set<string>>(new Set())

  const toggleProject = useCallback(async (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })

    // Lazy-load if not yet loaded
    if (!projectData.has(projectId)) {
      setLoadingProjects(prev => new Set(prev).add(projectId))
      try {
        const [milestones, tasks] = await Promise.all([
          projectsDb.fetchMilestones(projectId),
          projectsDb.fetchProjectTasks(projectId),
        ])
        setProjectData(prev => {
          const next = new Map(prev)
          next.set(projectId, { milestones, tasks })
          return next
        })
      } finally {
        setLoadingProjects(prev => {
          const next = new Set(prev)
          next.delete(projectId)
          return next
        })
      }
    }
  }, [projectData])

  const toggleMilestone = useCallback((msId: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev)
      next.has(msId) ? next.delete(msId) : next.add(msId)
      return next
    })
  }, [])

  // Only show active/paused projects
  const visibleProjects = useMemo(
    () => projects.filter(p => p.status !== 'completed'),
    [projects]
  )

  // ── Compute date range ──────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const dates: Date[] = [startOfDay(new Date())]

    visibleProjects.forEach(p => {
      const start = dateFromStr(p.startDate) ?? startOfDay(parseISO(p.createdAt))
      dates.push(start)
      if (p.deadline) dates.push(dateFromStr(p.deadline)!)
    })

    // Include loaded sub-row dates in range
    projectData.forEach(({ milestones, tasks }) => {
      milestones.forEach(m => { if (m.deadline) dates.push(dateFromStr(m.deadline)!) })
      tasks.forEach(t => {
        if (t.dueDate)   dates.push(dateFromStr(t.dueDate)!)
        if (t.startDate) dates.push(dateFromStr(t.startDate)!)
      })
    })

    const earliest = dates.reduce((a, b) => a < b ? a : b)
    const latest   = dates.reduce((a, b) => a > b ? a : b)

    const start = startOfWeek(addDays(earliest, -14), { weekStartsOn: 1 })
    const end   = endOfWeek(addDays(latest, 28),      { weekStartsOn: 1 })
    const total = differenceInDays(end, start) + 1

    return { rangeStart: start, rangeEnd: end, totalDays: total }
  }, [visibleProjects, projectData])

  const gridWidth = totalDays * DAY_W

  // Week headers
  const weeks = useMemo(() => {
    const result: { label: string; days: Date[] }[] = []
    let cur = rangeStart
    while (cur <= rangeEnd) {
      const days: Date[] = []
      for (let i = 0; i < 7; i++) days.push(addDays(cur, i))
      result.push({ label: format(cur, 'wo MMM', { locale: nl }), days })
      cur = addWeeks(cur, 1)
    }
    return result
  }, [rangeStart, rangeEnd])

  // Today line offset
  const todayOffset = differenceInDays(startOfDay(new Date()), rangeStart)

  // Scroll naar vandaag — herbruikbaar voor mount én knop
  const scrollToToday = useCallback((smooth = false) => {
    const el = containerRef.current
    if (!el) return
    const todayPx = LABEL_W + todayOffset * DAY_W + DAY_W / 2
    const scrollTarget = Math.max(0, todayPx - el.clientWidth / 2)
    if (smooth) {
      el.scrollTo({ left: scrollTarget, behavior: 'smooth' })
    } else {
      el.scrollLeft = scrollTarget
    }
  }, [todayOffset, DAY_W])

  // Scroll naar vandaag bij mount (eenmalig)
  const hasScrolledToToday = useRef(false)
  useEffect(() => {
    if (!hasScrolledToToday.current) {
      scrollToToday(false)
      hasScrolledToToday.current = true
    }
  }, [scrollToToday])

  // Weekend columns (computed once per render)
  const weekendCols = useMemo(() =>
    Array.from({ length: totalDays }, (_, i) => {
      const d = addDays(rangeStart, i)
      return d.getDay() === 0 || d.getDay() === 6
    }), [totalDays, rangeStart])

  // Group projects by client
  type Group = { clientName: string; projects: Project[] }
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    visibleProjects.forEach(p => {
      const key = p.clientId ?? '__intern__'
      if (!map.has(key)) {
        const c = p.clientId ? clients.find(c => c.id === p.clientId) : null
        map.set(key, { clientName: c?.companyName ?? 'Intern', projects: [] })
      }
      map.get(key)!.projects.push(p)
    })
    return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName))
  }, [visibleProjects, clients])

  if (visibleProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-text-muted">Geen actieve projecten gevonden</p>
        <p className="text-xs text-text-muted mt-1">Maak een project aan met een startdatum en deadline</p>
      </div>
    )
  }

  // ── Shared grid background ──────────────────────────────────────────────────
  function GridBg({ rowH }: { rowH: number }) {
    return (
      <>
        {weekendCols.map((isWe, i) => isWe ? (
          <div key={i} className="absolute top-0 bottom-0 bg-white/[0.012]" style={{ left: i * DAY_W, width: DAY_W }} />
        ) : null)}
        {todayOffset >= 0 && todayOffset <= totalDays && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400/60 z-10 pointer-events-none"
            style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
          />
        )}
      </>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden select-none">
      <div ref={containerRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_W + gridWidth }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-20 bg-surface-1 border-b border-border-subtle flex">
            <div
              className="shrink-0 flex items-end px-3 pb-1.5 text-xs text-text-muted font-medium border-r border-border-subtle"
              style={{ width: LABEL_W, height: 56 }}
            >
              Project
            </div>
            <div className="flex flex-col" style={{ width: gridWidth }}>
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
              <div className="flex h-7">
                {weeks.flatMap(w => w.days).map((d, i) => {
                  const we       = d.getDay() === 0 || d.getDay() === 6
                  const today    = isToday(d)
                  const isMonday = d.getDay() === 1
                  const showDay  = DAY_W >= 22
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'shrink-0 flex items-center justify-center text-[10px] border-r border-border-subtle/20 overflow-hidden',
                        today ? 'text-red-400 font-semibold' : we ? 'text-text-muted/30' : 'text-text-muted',
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

          {/* ── Groups + project rows ──────────────────────────────────── */}
          {groups.map(group => (
            <React.Fragment key={group.clientName}>
              {/* Group header */}
              <div
                className="flex items-center border-b border-border-subtle/50 bg-surface-0"
                style={{ height: 28 }}
              >
                <div
                  className="shrink-0 px-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-r border-border-subtle"
                  style={{ width: LABEL_W }}
                >
                  {group.clientName}
                </div>
                <div style={{ width: gridWidth }} />
              </div>

              {/* Project rows */}
              {group.projects.map(project => {
                const barStart = dateFromStr(project.startDate) ?? startOfDay(parseISO(project.createdAt))
                const barEnd   = dateFromStr(project.deadline) ?? addDays(startOfDay(new Date()), 14)
                const openEnded = !project.deadline

                const left  = Math.max(0, differenceInDays(barStart, rangeStart)) * DAY_W
                const width = Math.max(DAY_W * 2, (differenceInDays(barEnd, barStart) + 1) * DAY_W) - 4
                const isOverDeadline = project.deadline && dateFromStr(project.deadline)! < startOfDay(new Date())

                const isExpanded = expandedProjects.has(project.id)
                const isLoading  = loadingProjects.has(project.id)
                const data       = projectData.get(project.id)

                return (
                  <React.Fragment key={project.id}>
                    {/* ── Project row ──────────────────────────────────── */}
                    <div
                      className="flex border-b border-border-subtle/30 hover:bg-white/[0.02] group"
                      style={{ height: ROW_H }}
                    >
                      {/* Label */}
                      <div
                        className="shrink-0 flex items-center gap-1.5 px-2 border-r border-border-subtle"
                        style={{ width: LABEL_W }}
                      >
                        {/* Expand toggle */}
                        <button
                          className="shrink-0 p-0.5 rounded hover:bg-white/[0.08] transition-colors text-text-muted"
                          onClick={() => toggleProject(project.id)}
                          title={isExpanded ? 'Inklappen' : 'Uitklappen'}
                        >
                          {isLoading
                            ? <span className="w-3 h-3 flex items-center justify-center"><span className="w-2 h-2 rounded-full border border-text-muted/40 border-t-text-muted animate-spin" /></span>
                            : isExpanded
                              ? <ChevronDown size={13} />
                              : <ChevronRight size={13} />
                          }
                        </button>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span
                          className="text-xs text-text-secondary truncate group-hover:text-text-primary transition-colors cursor-pointer flex-1"
                          onClick={() => onProjectClick(project)}
                        >
                          {project.name}
                        </span>
                      </div>

                      {/* Grid */}
                      <div className="relative" style={{ width: gridWidth, height: ROW_H }}>
                        <GridBg rowH={ROW_H} />
                        {/* Project bar */}
                        <div
                          className="absolute top-[8px] rounded-md cursor-pointer flex items-center gap-2 px-2 border transition-opacity hover:opacity-90"
                          style={{
                            left: left + 2,
                            width: width,
                            height: ROW_H - 16,
                            backgroundColor: project.color + '55',
                            borderColor: isOverDeadline ? 'rgb(239 68 68 / 0.6)' : project.color + '88',
                          }}
                          onClick={() => onProjectClick(project)}
                          title={project.name}
                        >
                          <span className="text-[10px] text-white/80 truncate">{project.name}</span>
                          {openEnded && (
                            <span className="text-[10px] text-white/40 ml-auto shrink-0">→</span>
                          )}
                          {isOverDeadline && (
                            <span className="text-[10px] text-red-400 ml-auto shrink-0">verlopen</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Sub-rows: milestones + tasks ──────────────── */}
                    {isExpanded && data && (
                      <>
                        {data.milestones.length === 0 && data.tasks.length === 0 ? (
                          <div
                            className="flex border-b border-border-subtle/20"
                            style={{ height: ROW_H_SM }}
                          >
                            <div
                              className="shrink-0 flex items-center px-3 border-r border-border-subtle"
                              style={{ width: LABEL_W, paddingLeft: 32 }}
                            >
                              <span className="text-[10px] text-text-muted italic">Geen milestones of taken</span>
                            </div>
                            <div className="relative" style={{ width: gridWidth, height: ROW_H_SM }}>
                              <GridBg rowH={ROW_H_SM} />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Milestones with their tasks */}
                            {data.milestones.map(ms => {
                              const msTasks = data.tasks.filter(t => t.milestoneId === ms.id)
                              const msIsExpanded = expandedMilestones.has(ms.id)
                              const deadlineOffset = ms.deadline
                                ? differenceInDays(dateFromStr(ms.deadline)!, rangeStart)
                                : null
                              const msOverdue = ms.deadline && dateFromStr(ms.deadline)! < startOfDay(new Date())

                              return (
                                <React.Fragment key={ms.id}>
                                  {/* Milestone row */}
                                  <div
                                    className="flex border-b border-border-subtle/20 bg-white/[0.015]"
                                    style={{ height: ROW_H_SM }}
                                  >
                                    <button
                                      className="shrink-0 flex items-center gap-1.5 border-r border-border-subtle hover:bg-white/[0.04] transition-colors"
                                      style={{ width: LABEL_W, paddingLeft: 28, paddingRight: 12 }}
                                      onClick={() => toggleMilestone(ms.id)}
                                    >
                                      {msIsExpanded
                                        ? <ChevronDown size={11} className="shrink-0 text-text-muted" />
                                        : <ChevronRight size={11} className="shrink-0 text-text-muted" />}
                                      {msIsExpanded
                                        ? <FolderOpen size={12} className="shrink-0" style={{ color: ms.color }} />
                                        : <Folder size={12} className="shrink-0" style={{ color: ms.color }} />}
                                      <span className="text-[11px] font-semibold text-text-primary truncate flex-1 text-left">{ms.name}</span>
                                      {msTasks.length > 0 && (
                                        <span className="text-[9px] text-text-muted shrink-0">{msTasks.length}</span>
                                      )}
                                    </button>
                                    <div className="relative" style={{ width: gridWidth, height: ROW_H_SM }}>
                                      <GridBg rowH={ROW_H_SM} />
                                      {/* Deadline diamond */}
                                      {deadlineOffset !== null && deadlineOffset >= 0 && deadlineOffset <= totalDays && (
                                        <>
                                          <div
                                            className={clsx('absolute top-0 bottom-0 w-px z-10 pointer-events-none', msOverdue ? 'bg-red-400/50' : 'bg-white/20')}
                                            style={{ left: deadlineOffset * DAY_W + DAY_W / 2 }}
                                          />
                                          <div
                                            className={clsx('absolute z-20', msOverdue ? 'text-red-400' : 'text-text-primary')}
                                            style={{ left: deadlineOffset * DAY_W + DAY_W / 2 - 6, top: ROW_H_SM / 2 - 6 }}
                                            title={ms.name + (ms.deadline ? ' · ' + new Date(ms.deadline + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '')}
                                          >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                              <polygon points="6,0 12,6 6,12 0,6" />
                                            </svg>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Task rows under milestone */}
                                  {msIsExpanded && msTasks.map(task => {
                                    const barStart = dateFromStr(task.startDate) ?? startOfDay(parseISO(task.createdAt))
                                    const barEnd   = task.dueDate ? dateFromStr(task.dueDate)! : addDays(barStart, 3)
                                    const tLeft  = Math.max(0, differenceInDays(barStart, rangeStart)) * DAY_W
                                    const tWidth = Math.max(DAY_W, (differenceInDays(barEnd, barStart) + 1) * DAY_W) - 4
                                    return (
                                      <div
                                        key={task.id}
                                        className="flex border-b border-border-subtle/15 hover:bg-white/[0.015] group"
                                        style={{ height: ROW_H_SM }}
                                      >
                                        <div
                                          className="shrink-0 flex items-center gap-2 border-r border-border-subtle"
                                          style={{ width: LABEL_W, paddingLeft: 44, paddingRight: 12 }}
                                        >
                                          <span className={clsx(
                                            'w-1.5 h-1.5 rounded-full shrink-0',
                                            task.status === 'done' ? 'bg-green-400' :
                                            task.status === 'in_review' ? 'bg-purple-400' :
                                            task.status === 'in_progress' ? 'bg-blue-400' : 'bg-zinc-500'
                                          )} />
                                          <span className="text-[11px] text-text-secondary truncate group-hover:text-text-primary transition-colors">
                                            {task.title}
                                          </span>
                                        </div>
                                        <div className="relative" style={{ width: gridWidth, height: ROW_H_SM }}>
                                          <GridBg rowH={ROW_H_SM} />
                                          <div
                                            className={clsx(
                                              'absolute top-[6px] rounded border cursor-pointer transition-opacity hover:opacity-90 flex items-center px-1.5',
                                              STATUS_COLOR[task.status],
                                            )}
                                            style={{ left: tLeft + 2, width: tWidth, height: ROW_H_SM - 12 }}
                                            title={task.title}
                                          >
                                            <span className="text-[9px] text-white/80 truncate">{task.title}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </React.Fragment>
                              )
                            })}

                            {/* Tasks without a milestone */}
                            {data.tasks
                              .filter(t => !t.milestoneId || !data.milestones.find(m => m.id === t.milestoneId))
                              .map(task => {
                                const barStart = dateFromStr(task.startDate) ?? startOfDay(parseISO(task.createdAt))
                                const barEnd   = task.dueDate ? dateFromStr(task.dueDate)! : addDays(barStart, 3)
                                const tLeft  = Math.max(0, differenceInDays(barStart, rangeStart)) * DAY_W
                                const tWidth = Math.max(DAY_W, (differenceInDays(barEnd, barStart) + 1) * DAY_W) - 4
                                return (
                                  <div
                                    key={task.id}
                                    className="flex border-b border-border-subtle/15 hover:bg-white/[0.015] group"
                                    style={{ height: ROW_H_SM }}
                                  >
                                    <div
                                      className="shrink-0 flex items-center gap-2 border-r border-border-subtle"
                                      style={{ width: LABEL_W, paddingLeft: 32, paddingRight: 12 }}
                                    >
                                      <span className={clsx(
                                        'w-1.5 h-1.5 rounded-full shrink-0',
                                        task.status === 'done' ? 'bg-green-400' :
                                        task.status === 'in_review' ? 'bg-purple-400' :
                                        task.status === 'in_progress' ? 'bg-blue-400' : 'bg-zinc-500'
                                      )} />
                                      <span className="text-[11px] text-text-secondary truncate group-hover:text-text-primary transition-colors">
                                        {task.title}
                                      </span>
                                    </div>
                                    <div className="relative" style={{ width: gridWidth, height: ROW_H_SM }}>
                                      <GridBg rowH={ROW_H_SM} />
                                      <div
                                        className={clsx(
                                          'absolute top-[6px] rounded border cursor-pointer transition-opacity hover:opacity-90 flex items-center px-1.5',
                                          STATUS_COLOR[task.status],
                                        )}
                                        style={{ left: tLeft + 2, width: tWidth, height: ROW_H_SM - 12 }}
                                        title={task.title}
                                      >
                                        <span className="text-[9px] text-white/80 truncate">{task.title}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                          </>
                        )}
                      </>
                    )}
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend + zoom */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-2 border-t border-border-subtle text-[10px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-red-400/70" /> Vandaag
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-2 rounded-sm bg-white/10 border border-white/20" /> Geen deadline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-2 rounded-sm bg-white/10 border border-red-500/60" /> Verlopen
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => scrollToToday(true)}
            className="px-2 py-0.5 rounded border border-border-default text-[10px] text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            Vandaag
          </button>
          <span className="w-px h-3 bg-border-default" />
          <button
            onClick={() => setDayW(v => clampZoom(v - BUTTON_STEP))}
            disabled={dayW <= DAY_W_MIN}
            className="p-1 rounded hover:bg-white/[0.07] disabled:opacity-30 transition-colors"
            title="Uitzoomen (of Alt+scroll)"
          >
            <ZoomOut size={13} />
          </button>
          <span className="w-8 text-center tabular-nums">
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
