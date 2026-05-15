import type { ElementType } from 'react'
import { Circle, CircleDot, Eye, CheckCircle2 } from 'lucide-react'
import type { TaskStatus, TaskPriority, ProjectStatus } from '../../types'

export const TASK_STATUSES: {
  id: TaskStatus
  label: string
  Icon: ElementType
  color: string
  bg: string
  headerBg: string
  ring: string
}[] = [
  { id: 'todo', label: 'Te doen', Icon: Circle, color: 'text-zinc-400', bg: 'bg-zinc-500/[0.08]', headerBg: 'bg-zinc-500/10', ring: 'bg-zinc-400' },
  { id: 'in_progress', label: 'Bezig', Icon: CircleDot, color: 'text-blue-400', bg: 'bg-blue-500/[0.06]', headerBg: 'bg-blue-500/10', ring: 'bg-blue-400' },
  { id: 'in_review', label: 'Review', Icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/[0.06]', headerBg: 'bg-purple-500/10', ring: 'bg-purple-400' },
  { id: 'done', label: 'Klaar', Icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/[0.05]', headerBg: 'bg-green-500/10', ring: 'bg-green-400' },
]

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; border: string; flagColor: string }> = {
  low: { label: 'Laag', color: 'text-zinc-500', border: 'border-l-zinc-600', flagColor: 'text-zinc-500' },
  medium: { label: 'Normaal', color: 'text-blue-400', border: 'border-l-blue-500', flagColor: 'text-blue-400' },
  high: { label: 'Hoog', color: 'text-orange-400', border: 'border-l-orange-500', flagColor: 'text-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400', border: 'border-l-red-500', flagColor: 'text-red-400' },
}

export const PROJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#06b6d4', '#f59e0b', '#6366f1',
]

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string }> = {
  active: { label: 'Actief', cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
  paused: { label: 'Gepauzeerd', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  completed: { label: 'Afgerond', cls: 'text-zinc-400  bg-zinc-500/10  border-zinc-500/25' },
}
