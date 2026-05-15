import { format, parseISO } from 'date-fns'
import type { TimeEntry, TimeTag } from '../../types'
import { HOUR_PX, SLOT_MINS } from './timeTrackingConstants'

export function snapMins(raw: number): number {
  return Math.round(raw / SLOT_MINS) * SLOT_MINS
}

export function clampMins(m: number): number {
  return Math.max(0, Math.min(23 * 60 + 45, m))
}

export function yToMins(y: number): number {
  return clampMins(snapMins((y / HOUR_PX) * 60))
}

export function minsToY(m: number): number {
  return (m / 60) * HOUR_PX
}

export function minsToTimeStr(m: number): string {
  const capped = Math.min(m, 23 * 60 + 59)
  return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`
}

export function getDurationSeconds(entry: TimeEntry, now = Date.now()): number {
  const start = new Date(entry.startedAt).getTime()
  const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now
  return Math.max(0, Math.floor((end - start) / 1000))
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatHoursShort(seconds: number): string {
  if (seconds === 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}u`
  return `${h}u ${m}m`
}

export function isoToLocalDate(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd')
}

export function isoToLocalTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

export function localToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function entriesForDate(entries: TimeEntry[], date: Date): TimeEntry[] {
  const day = format(date, 'yyyy-MM-dd')
  return entries.filter((e) => isoToLocalDate(e.startedAt) === day)
}

export function entryStartMins(entry: TimeEntry): number {
  const d = parseISO(entry.startedAt)
  return d.getHours() * 60 + d.getMinutes()
}

export function entryEndMins(entry: TimeEntry, now: number): number {
  const d = entry.endedAt ? parseISO(entry.endedAt) : new Date(now)
  return d.getHours() * 60 + d.getMinutes()
}

export function exportCsv(
  entries: TimeEntry[],
  clientMap: Record<string, string>,
  tagMap: Record<string, TimeTag>,
  userMap: Record<string, string>,
) {
  const header = ['Datum', 'Start', 'Eind', 'Duur', 'Omschrijving', 'Klant', 'Tags', 'Medewerker']
  const rows = entries
    .filter((e) => !e.isRunning)
    .map((e) => [
      isoToLocalDate(e.startedAt),
      isoToLocalTime(e.startedAt),
      e.endedAt ? isoToLocalTime(e.endedAt) : '',
      formatDuration(getDurationSeconds(e)),
      `"${e.description.replace(/"/g, '""')}"`,
      clientMap[e.clientId ?? ''] ?? '',
      e.tagIds.map((id) => tagMap[id]?.name ?? '').filter(Boolean).join(', '),
      userMap[e.userId] ?? '',
    ])
  const csv = [header, ...rows].map((r) => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `uren-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export interface EntryLayout {
  entry: TimeEntry
  col: number
  totalCols: number
}

export function layoutDayEntries(dayEntries: TimeEntry[], now: number): EntryLayout[] {
  if (dayEntries.length === 0) return []

  const sorted = [...dayEntries].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  )

  const colEnds: number[] = []
  const assignments = new Map<string, number>()

  for (const entry of sorted) {
    const startMin = entryStartMins(entry)
    let col = -1
    for (let c = 0; c < colEnds.length; c++) {
      if ((colEnds[c] ?? 0) <= startMin) {
        col = c
        break
      }
    }
    if (col === -1) {
      col = colEnds.length
      colEnds.push(0)
    }
    colEnds[col] = Math.min(entryEndMins(entry, now), 24 * 60)
    assignments.set(entry.id, col)
  }

  return sorted.map((entry) => {
    const startMin = entryStartMins(entry)
    const endMin = Math.min(entryEndMins(entry, now), 24 * 60)
    const myCol = assignments.get(entry.id)!

    let maxCol = myCol
    for (const other of sorted) {
      if (other.id === entry.id) continue
      const oStart = entryStartMins(other)
      const oEnd = Math.min(entryEndMins(other, now), 24 * 60)
      if (oStart < endMin && oEnd > startMin) {
        maxCol = Math.max(maxCol, assignments.get(other.id)!)
      }
    }
    return { entry, col: myCol, totalCols: maxCol + 1 }
  })
}
