import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus, ChevronLeft, X, Trash2, Check, Flag,
  Folder, Circle, CircleDot, Eye, CheckCircle2,
  LayoutGrid, List, ChevronDown, ChevronsUpDown,
  MessageSquare, Activity, Send, Zap,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { projectsDb, type TaskComment, type Sprint, type SprintStatus, type ProjectActivity } from '../lib/projectsDb'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProjectsData, UserProfileLite } from '../hooks/useProjectsData'
import { notificationsDb } from '../lib/notificationsDb'
import { errorMessage } from '../lib/errors'
import { parseMentions } from '../components/MentionTextarea'
import { MentionTextarea } from '../components/MentionTextarea'
import clsx from 'clsx'
import type { Project, Task, Subtask, TaskStatus, TaskPriority, ProjectStatus } from '../types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Command, CommandEmpty, CommandGroup, CommandInput as CommandSearchInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@/components/ui/select'
import { PillDropdown } from '@/components/ui/pill-dropdown'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ── Constants ──────────────────────────────────────────────────────────────────

const TASK_STATUSES: {
  id: TaskStatus; label: string; Icon: React.ElementType
  color: string; bg: string; headerBg: string; ring: string
}[] = [
  { id: 'todo',        label: 'Te doen', Icon: Circle,       color: 'text-zinc-400',   bg: 'bg-zinc-500/[0.08]', headerBg: 'bg-zinc-500/10',   ring: 'bg-zinc-400' },
  { id: 'in_progress', label: 'Bezig',   Icon: CircleDot,    color: 'text-blue-400',   bg: 'bg-blue-500/[0.06]', headerBg: 'bg-blue-500/10',   ring: 'bg-blue-400' },
  { id: 'in_review',   label: 'Review',  Icon: Eye,          color: 'text-purple-400', bg: 'bg-purple-500/[0.06]', headerBg: 'bg-purple-500/10', ring: 'bg-purple-400' },
  { id: 'done',        label: 'Klaar',   Icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/[0.05]', headerBg: 'bg-green-500/10',  ring: 'bg-green-400' },
]

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; border: string; flagColor: string }> = {
  low:    { label: 'Laag',    color: 'text-zinc-500',   border: 'border-l-zinc-600',   flagColor: 'text-zinc-500' },
  medium: { label: 'Normaal', color: 'text-blue-400',   border: 'border-l-blue-500',   flagColor: 'text-blue-400' },
  high:   { label: 'Hoog',    color: 'text-orange-400', border: 'border-l-orange-500', flagColor: 'text-orange-400' },
  urgent: { label: 'Urgent',  color: 'text-red-400',    border: 'border-l-red-500',    flagColor: 'text-red-400' },
}

const PROJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#06b6d4', '#f59e0b', '#6366f1',
]

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string }> = {
  active:    { label: 'Actief',      cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
  paused:    { label: 'Gepauzeerd',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  completed: { label: 'Afgerond',    cls: 'text-zinc-400  bg-zinc-500/10  border-zinc-500/25' },
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function ProjectClientCombobox({ value, onChange, clients }: { value: string; onChange: (v: string) => void; clients: { id: string; companyName: string }[] }) {
  const [open, setOpen] = useState(false)
  const selected = clients.find(c => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm">
          {selected ? selected.companyName : <span className="text-muted-foreground">Selecteer klant...</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandSearchInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klant gevonden.</CommandEmpty>
            <CommandGroup>
              {clients.map(c => (
                <CommandItem key={c.id} value={c.companyName} onSelect={() => { onChange(c.id); setOpen(false) }}>
                  <Check size={14} className={cn('mr-2', value === c.id ? 'opacity-100' : 'opacity-0')} />
                  {c.companyName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function TaskDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isOverdue = value && new Date(value + 'T00:00:00') < new Date()
  return (
    <DatePickerButton
      value={value || undefined}
      onChange={onChange}
      placeholder="Deadline"
      className={clsx(
        'rounded-md border-border-subtle bg-white/[0.04] hover:bg-white/[0.08]',
        isOverdue ? 'text-red-400 [&_svg]:text-red-400' : ''
      )}
    />
  )
}

// ── Project Modal ──────────────────────────────────────────────────────────────

function ProjectModal({
  project, clientId, onClose, onSaved, onDeleted,
}: {
  project?: Project
  clientId?: string
  onClose: () => void
  onSaved: (p: Project) => void
  onDeleted?: (id: string) => void
}) {
  const clients = useStore(s => s.clients)
  const isEdit = !!project

  const [selectedClient, setSelectedClient] = useState(project?.clientId ?? clientId ?? '')
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !selectedClient) return
    setLoading(true); setError(null)
    try {
      const saved = await projectsDb.saveProject({
        id: project?.id,
        clientId: selectedClient,
        name: name.trim(),
        description: description.trim() || null,
        status,
        color,
      })
      toast.success(isEdit ? 'Project opgeslagen' : 'Project aangemaakt')
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setLoading(true)
    try {
      await projectsDb.deleteProject(project.id)
      toast.success('Project verwijderd')
    } catch (err: unknown) {
      setError(errorMessage(err))
      setLoading(false)
      return
    }
    onDeleted?.(project.id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Project bewerken' : 'Nieuw project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>Klant <span className="text-destructive">*</span></Label>
            <ProjectClientCombobox value={selectedClient} onChange={setSelectedClient} clients={clients} />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Projectnaam <span className="text-destructive">*</span></Label>
            <Input id="proj-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Bijv. Website redesign" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Omschrijving</Label>
            <Textarea id="proj-desc" value={description ?? ''} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optionele beschrijving..." className="resize-none" />
          </div>

          {/* Status */}
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Status</label>
              <div className="flex gap-2">
                {(Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[]).map(s => (
                  <button
                    key={s} type="button" onClick={() => setStatus(s)}
                    className={clsx(
                      'flex-1 py-1.5 px-2 rounded-lg border text-xs transition-colors',
                      status === s ? PROJECT_STATUS_CONFIG[s].cls : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                    )}
                  >
                    {PROJECT_STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Kleur</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  className={clsx('w-6 h-6 rounded-full transition-transform', color === c && 'ring-2 ring-offset-2 ring-offset-surface-1 scale-110')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {isEdit && (
              deleteConfirm ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Zeker?</span>
                  <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300">Ja</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="text-text-muted hover:text-text-primary">Nee</button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} className="text-xs text-muted-foreground hover:text-destructive gap-1">
                  <Trash2 size={12} /> Verwijderen
                </Button>
              )
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
              <Button type="submit" disabled={loading || !name.trim() || !selectedClient}>
                {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Pill dropdown ──────────────────────────────────────────────────────────────

// ── Task Modal ─────────────────────────────────────────────────────────────────

function TaskModal({
  task, projectId, defaultStatus = 'todo', profiles, onClose, onSaved, onDeleted,
}: {
  task?: Task
  projectId: string
  defaultStatus?: TaskStatus
  profiles: UserProfileLite[]
  onClose: () => void
  onSaved: (t: Task) => void
  onDeleted?: (id: string) => void
}) {
  const isEdit = !!task
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const modalProfile = useAuthStore(s => s.profile)

  useEffect(() => {
    if (isEdit) { loadSubtasks(); loadComments() }
  }, [])

  async function loadSubtasks() {
    const data = await projectsDb.fetchTaskSubtasks(task!.id)
    setSubtasks(data)
  }

  async function loadComments() {
    const data = await projectsDb.fetchTaskComments(task!.id)
    setComments(data)
  }

  async function addComment() {
    if (!newComment.trim() || !task || !modalProfile) return
    setCommentLoading(true)
    try {
      const comment = await projectsDb.addTaskComment({
        taskId: task.id,
        authorId: modalProfile.id,
        authorEmail: modalProfile.email,
        authorName: modalProfile.name ?? null,
        content: newComment.trim(),
      })
      setComments(prev => [...prev, comment])
      setNewComment('')

      // Parse @mentions and send notifications
      const allProfiles = await projectsDb.fetchProfilesBasic()
      const emails = parseMentions(newComment.trim(), allProfiles)
      for (const email of emails) {
        const target = allProfiles.find(p => p.email === email)
        if (!target) continue
        await notificationsDb.create({
          userId: target.id,
          actorEmail: modalProfile.email,
          type: 'mention',
          content: `${modalProfile.name ?? modalProfile.email} noemde jou in een opmerking op taak "${task.title}"`,
          linkedType: 'task_comment',
          linkedId: comment.id,
        })
      }

      // Log activity
      await projectsDb.logActivity({
        projectId,
        taskId: task.id,
        actorEmail: modalProfile.email,
        action: 'commented',
        metadata: { taskTitle: task.title },
      })
    } catch {
      // silent
    } finally {
      setCommentLoading(false)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true); setError(null)
    try {
      const saved = await projectsDb.saveTask({
        id: task?.id,
        projectId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        position: 0,
      })
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!task) return; setLoading(true)
    try {
      await projectsDb.deleteTask(task.id)
    } catch (err: unknown) {
      setError(errorMessage(err))
      setLoading(false)
      return
    }
    onDeleted?.(task.id); onClose()
  }

  async function addSubtask() {
    if (!newSubtask.trim() || !task) return
    try {
      const data = await projectsDb.addSubtask(task.id, newSubtask.trim(), subtasks.length)
      setSubtasks(prev => [...prev, data])
    } catch {
      return
    }
    setNewSubtask('')
  }

  async function toggleSubtask(s: Subtask) {
    await projectsDb.toggleSubtaskDone(s.id, !s.done)
    setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, done: !x.done } : x))
  }

  async function deleteSubtask(id: string) {
    await projectsDb.deleteSubtask(id)
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const currentStatus = TASK_STATUSES.find(s => s.id === status)!
  const assignee = profiles.find(p => p.id === assigneeId)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 flex flex-col max-h-[85vh] overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">{isEdit ? 'Taak bewerken' : 'Nieuwe taak'}</DialogTitle>
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle shrink-0">
          <span className="text-xs text-text-muted">Projecten</span>
          <span className="text-text-muted">›</span>
          <span className="text-xs text-text-muted">{isEdit ? 'Taak bewerken' : 'Nieuwe taak'}</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto h-6 w-6 text-text-muted">
            <X size={15} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-5 pt-4 pb-1">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
              autoFocus
              placeholder="Taaknaam..."
              className="w-full bg-transparent text-base font-medium text-text-primary placeholder-zinc-600 focus:outline-none resize-none"
            />
          </div>

          {/* Description */}
          <div className="px-5 pb-3">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Voeg een beschrijving toe..."
              className="w-full bg-transparent text-sm text-text-secondary placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Subtasks — only when editing */}
          {isEdit && (
            <div className="px-5 pb-4 border-t border-border-subtle pt-3">
              <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
                Subtaken
                {subtasks.length > 0 && <span className="ml-1.5 font-normal">{subtasks.filter(s => s.done).length}/{subtasks.length}</span>}
              </p>
              <div className="space-y-1 mb-2">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 group py-0.5">
                    <button type="button" onClick={() => toggleSubtask(s)}
                      className={clsx('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        s.done ? 'bg-green-500 border-green-500' : 'border-zinc-600 hover:border-zinc-400')}>
                      {s.done && <Check size={9} className="text-white" />}
                    </button>
                    <span className={clsx('text-sm flex-1', s.done ? 'line-through text-text-muted' : 'text-text-primary')}>
                      {s.title}
                    </span>
                    <button type="button" onClick={() => deleteSubtask(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
                  placeholder="Subtaak toevoegen..."
                  className="flex-1 px-2.5 py-1 bg-white/[0.04] border border-border-subtle rounded-md text-sm text-text-primary placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors" />
                <button type="button" onClick={addSubtask} disabled={!newSubtask.trim()}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary rounded-md transition-colors disabled:opacity-40">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Comments — only when editing */}
          {isEdit && (
            <div className="px-5 pb-4 border-t border-border-subtle pt-3">
              <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare size={11} />
                Opmerkingen
                {comments.length > 0 && <span className="font-normal">({comments.length})</span>}
              </p>

              {/* Comment list */}
              {comments.length > 0 && (
                <div className="space-y-3 mb-3">
                  {comments.map(c => {
                    const name = c.authorName ?? c.authorEmail.split('@')[0]
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-accent-blue">{name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-medium text-text-primary">{name}</span>
                            <span className="text-[10px] text-text-muted">
                              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: nl })}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* New comment */}
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-accent-blue">
                    {(modalProfile?.name ?? modalProfile?.email ?? 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 relative">
                  <MentionTextarea
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Schrijf een opmerking... gebruik @ om iemand te taggen"
                    rows={2}
                    className="px-2.5 py-1.5 bg-white/[0.04] border border-border-subtle rounded-md placeholder-zinc-700 focus:border-zinc-600 transition-colors text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addComment}
                  disabled={!newComment.trim() || commentLoading}
                  className="p-1.5 bg-accent-blue hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-40 shrink-0 mt-0.5"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom metadata bar */}
        <div className="border-t border-border-subtle px-4 py-3 flex items-center gap-1.5 flex-wrap">
          {/* Status pill */}
          <PillDropdown<TaskStatus>
            options={TASK_STATUSES.map(s => s.id)}
            value={status}
            onChange={setStatus}
            renderLabel={v => {
              const s = TASK_STATUSES.find(x => x.id === v)!
              return <><s.Icon size={12} className={s.color} /><span>{s.label}</span></>
            }}
            renderOption={v => {
              const s = TASK_STATUSES.find(x => x.id === v)!
              return <><s.Icon size={12} className={s.color} /><span>{s.label}</span></>
            }}
          />

          {/* Priority pill */}
          <PillDropdown<TaskPriority>
            options={['low', 'medium', 'high', 'urgent']}
            value={priority}
            onChange={setPriority}
            renderLabel={v => {
              const p = PRIORITY_CONFIG[v]
              return <><Flag size={11} className={p.flagColor} /><span className={p.color}>{p.label}</span></>
            }}
            renderOption={v => {
              const p = PRIORITY_CONFIG[v]
              return <><Flag size={11} className={p.flagColor} /><span>{p.label}</span></>
            }}
          />

          {/* Assignee pill */}
          <PillDropdown<string>
            options={['__none__', ...profiles.map(p => p.id)]}
            value={assigneeId || '__none__'}
            onChange={(v) => setAssigneeId(v === '__none__' ? '' : v)}
            renderLabel={() => assignee
              ? <><div className="w-4 h-4 rounded-full bg-accent-blue/25 flex items-center justify-center text-[9px] font-bold text-accent-blue">{(assignee.name ?? assignee.email).charAt(0).toUpperCase()}</div><span>{assignee.name ?? assignee.email.split('@')[0]}</span></>
              : <><div className="w-4 h-4 rounded-full border border-dashed border-zinc-600" /><span className="text-zinc-500">Niemand</span></>
            }
            renderOption={id => {
              if (id === '__none__') return <><div className="w-4 h-4 rounded-full border border-dashed border-zinc-600" /><span>Niemand</span></>
              const p = profiles.find(x => x.id === id)!
              return <><div className="w-4 h-4 rounded-full bg-accent-blue/25 flex items-center justify-center text-[9px] font-bold text-accent-blue">{(p.name ?? p.email).charAt(0).toUpperCase()}</div><span>{p.name ?? p.email.split('@')[0]}</span></>
            }}
          />

          {/* Due date */}
          <TaskDatePicker value={dueDate} onChange={setDueDate} />

          {/* Error */}
          {error && <span className="text-xs text-red-400 ml-1">{error}</span>}

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">
            {isEdit && (
              deleteConfirm ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Zeker?</span>
                  <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300">Ja</button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="text-text-muted">Nee</button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteConfirm(true)} className="h-7 w-7 text-zinc-600 hover:text-destructive">
                  <Trash2 size={13} />
                </Button>
              )
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className="h-7 text-xs"
            >
              {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Taak aanmaken'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Task Card (Kanban) ─────────────────────────────────────────────────────────

function TaskCard({
  task, profiles, onClick, isDragging,
  onDragStart, onDragEnd,
}: {
  task: Task
  profiles: UserProfileLite[]
  onClick: () => void
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const assignee = profiles.find(p => p.id === task.assigneeId)
  const prio = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  const initials = assignee ? (assignee.name ?? assignee.email).charAt(0).toUpperCase() : null

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        'bg-surface-0 border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-zinc-500 hover:shadow-lg hover:shadow-black/20 transition-all group border-l-[3px] select-none',
        prio.border,
        isDragging && 'opacity-40 scale-[0.98]',
      )}
    >
      <p className="text-sm text-text-primary leading-snug group-hover:text-white transition-colors mb-2">
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-text-muted mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex items-center gap-1.5">
        {task.priority !== 'medium' && (
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium', prio.flagColor)}>
            <Flag size={9} />
            {prio.label}
          </span>
        )}
        {task.dueDate && (
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded',
            isOverdue ? 'text-red-400 bg-red-500/10' : 'text-text-muted bg-white/[0.04]'
          )}>
            {new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {initials && (
          <div className="ml-auto w-5 h-5 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
            <span className="text-[9px] font-semibold text-accent-blue">{initials}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Kanban Board ───────────────────────────────────────────────────────────────

function KanbanBoard({
  tasks, profiles, onTaskClick, onAddTask, onStatusChange,
}: {
  tasks: Task[]
  profiles: UserProfileLite[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    tasks.forEach(t => map[t.status].push(t))
    Object.values(map).forEach(arr => arr.sort((a, b) => a.position - b.position))
    return map
  }, [tasks])

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    if (draggedId) {
      const task = tasks.find(t => t.id === draggedId)
      if (task && task.status !== status) {
        onStatusChange(draggedId, status)
      }
    }
    setDraggedId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-4 snap-x snap-mandatory">
      {TASK_STATUSES.map(({ id, label, Icon, color, bg, headerBg, ring }) => {
        const isOver = dragOverStatus === id
        const isDragSource = draggedId !== null && byStatus[id].some(t => t.id === draggedId)
        return (
          <div
            key={id}
            onDragOver={e => handleDragOver(e, id)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={e => handleDrop(e, id)}
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
            {/* Column header */}
            <div className={clsx('flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle', headerBg)}>
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={color} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</span>
              <span className={clsx(
                'ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full',
                byStatus[id].length > 0 ? `${color} bg-white/[0.08]` : 'text-text-muted'
              )}>
                {byStatus[id].length}
              </span>
            </div>

            {/* Cards + drop zone */}
            <div
              className={clsx(
                'flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150',
                isOver && byStatus[id].length === 0 && 'bg-accent-blue/[0.06]',
              )}
            >
              {byStatus[id].map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  profiles={profiles}
                  onClick={() => { if (!draggedId) onTaskClick(task) }}
                  isDragging={draggedId === task.id}
                  onDragStart={() => setDraggedId(task.id)}
                  onDragEnd={() => { setDraggedId(null); setDragOverStatus(null) }}
                />
              ))}

              {/* Drop indicator when dragging over an empty or non-source column */}
              {isOver && draggedId && !byStatus[id].some(t => t.id === draggedId) && (
                <div className="border-2 border-dashed border-accent-blue/40 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-accent-blue/60">Hier neerzetten</span>
                </div>
              )}
            </div>

            {/* Add task */}
            <div className="p-2 border-t border-border-subtle">
              <button
                onClick={() => onAddTask(id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <Plus size={12} />
                Taak toevoegen
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── List View ──────────────────────────────────────────────────────────────────

function ListView({
  tasks, profiles, onTaskClick, onAddTask,
}: {
  tasks: Task[]
  profiles: UserProfileLite[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    todo: false, in_progress: false, in_review: false, done: false,
  })

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    tasks.forEach(t => map[t.status].push(t))
    return map
  }, [tasks])

  return (
    <div className="space-y-2 pb-4">
      {TASK_STATUSES.map(({ id, label, Icon, color, ring }) => {
        const groupTasks = byStatus[id]
        const isCollapsed = collapsed[id]
        return (
          <div key={id} className="rounded-xl border border-border-subtle overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-1 hover:bg-white/[0.03] transition-colors"
            >
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={color} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</span>
              <span className="text-xs text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded-full ml-1">
                {groupTasks.length}
              </span>
              <ChevronDown
                size={13}
                className={clsx('ml-auto text-text-muted transition-transform', isCollapsed && '-rotate-90')}
              />
            </button>

            {/* Task rows */}
            {!isCollapsed && (
              <div className="divide-y divide-border-subtle">
                {groupTasks.map(task => {
                  const assignee = profiles.find(p => p.id === task.assigneeId)
                  const prio = PRIORITY_CONFIG[task.priority]
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="flex items-center gap-3 px-4 py-2.5 bg-surface-0 hover:bg-white/[0.02] cursor-pointer group transition-colors"
                    >
                      {/* Priority indicator */}
                      <div className={clsx('w-[3px] h-5 rounded-full shrink-0', {
                        'bg-zinc-600':   task.priority === 'low',
                        'bg-blue-500':   task.priority === 'medium',
                        'bg-orange-500': task.priority === 'high',
                        'bg-red-500':    task.priority === 'urgent',
                      })} />

                      {/* Status icon */}
                      <Icon size={14} className={clsx(color, 'shrink-0')} />

                      {/* Title */}
                      <span className="flex-1 text-sm text-text-primary group-hover:text-white transition-colors truncate">
                        {task.title}
                      </span>

                      {/* Priority label (non-medium only) */}
                      {task.priority !== 'medium' && (
                        <span className={clsx('hidden sm:flex items-center gap-1 text-xs shrink-0', prio.flagColor)}>
                          <Flag size={10} />
                          {prio.label}
                        </span>
                      )}

                      {/* Due date */}
                      {task.dueDate && (
                        <span className={clsx('text-xs shrink-0', isOverdue ? 'text-red-400' : 'text-text-muted')}>
                          {new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}

                      {/* Assignee */}
                      {assignee ? (
                        <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-accent-blue">
                            {(assignee.name ?? assignee.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-dashed border-zinc-700 shrink-0" />
                      )}
                    </div>
                  )
                })}

                {/* Add row */}
                <button
                  onClick={() => onAddTask(id)}
                  className="w-full flex items-center gap-3 px-4 py-2 bg-surface-0 hover:bg-white/[0.02] text-text-muted hover:text-text-secondary transition-colors"
                >
                  <div className="w-[3px] h-4 rounded-full bg-transparent shrink-0" />
                  <Plus size={13} />
                  <span className="text-xs">Taak toevoegen</span>
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── All Tasks Overview ─────────────────────────────────────────────────────────

interface ClientInfo { id: string; companyName: string }

function AllTasksView({
  tasks, projects, clients, profiles, currentUserId, onTaskClick,
}: {
  tasks: Task[]
  projects: Project[]
  clients: ClientInfo[]
  profiles: UserProfileLite[]
  currentUserId?: string
  onTaskClick: (task: Task) => void
}) {
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    todo: false, in_progress: false, in_review: false, done: true,
  })

  const filteredTasks = useMemo(() => {
    if (!myTasksOnly || !currentUserId) return tasks
    return tasks.filter((t) => t.assigneeId === currentUserId)
  }, [tasks, myTasksOnly, currentUserId])

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    filteredTasks.forEach(t => map[t.status].push(t))
    return map
  }, [filteredTasks])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])
  const clientMap  = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  return (
    <div className="space-y-2 pb-6">
      {/* Mijn taken / Alle taken toggle */}
      {currentUserId && (
        <div className="flex items-center bg-surface-0 border border-border-subtle rounded-lg p-0.5 w-fit mb-4">
          <button
            onClick={() => setMyTasksOnly(false)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
              !myTasksOnly ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            Alle taken
          </button>
          <button
            onClick={() => setMyTasksOnly(true)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
              myTasksOnly ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            Mijn taken
          </button>
        </div>
      )}

      {TASK_STATUSES.map(({ id, label, Icon, color, ring }) => {
        const groupTasks = byStatus[id]
        const isCollapsed = collapsed[id]
        return (
          <div key={id} className="rounded-xl border border-border-subtle overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-1 hover:bg-white/[0.03] transition-colors"
            >
              <div className={clsx('w-2 h-2 rounded-full shrink-0', ring)} />
              <Icon size={13} className={color} />
              <span className={clsx('text-xs font-semibold uppercase tracking-wider', color)}>{label}</span>
              <span className="text-xs text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded-full ml-1">
                {groupTasks.length}
              </span>
              <ChevronDown size={13} className={clsx('ml-auto text-text-muted transition-transform', isCollapsed && '-rotate-90')} />
            </button>

            {!isCollapsed && (
              <div>
                {/* Column headers */}
                {groupTasks.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-0 border-b border-border-subtle">
                    <div className="w-[3px] shrink-0" />
                    <Icon size={14} className="shrink-0 opacity-0" />
                    <span className="flex-1 text-[10px] uppercase tracking-wider text-text-muted font-semibold">Taak</span>
                    <span className="w-32 shrink-0 text-[10px] uppercase tracking-wider text-text-muted font-semibold hidden lg:block">Project</span>
                    <span className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-text-muted font-semibold hidden md:block">Klant</span>
                    <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-text-muted font-semibold hidden sm:block">Deadline</span>
                    <span className="w-6 shrink-0" />
                  </div>
                )}

                {/* Task rows */}
                <div className="divide-y divide-border-subtle">
                  {groupTasks.map(task => {
                    const project  = projectMap[task.projectId]
                    const client   = project ? clientMap[project.clientId] : undefined
                    const assignee = profiles.find(p => p.id === task.assigneeId)
                    const prio     = PRIORITY_CONFIG[task.priority]
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-surface-0 hover:bg-white/[0.025] cursor-pointer group transition-colors"
                      >
                        {/* Priority bar */}
                        <div className={clsx('w-[3px] h-5 rounded-full shrink-0', {
                          'bg-zinc-700':   task.priority === 'low',
                          'bg-blue-500':   task.priority === 'medium',
                          'bg-orange-500': task.priority === 'high',
                          'bg-red-500':    task.priority === 'urgent',
                        })} />

                        {/* Status icon */}
                        <Icon size={14} className={clsx(color, 'shrink-0')} />

                        {/* Title + priority label */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-sm text-text-primary group-hover:text-white transition-colors truncate">
                            {task.title}
                          </span>
                          {task.priority !== 'medium' && (
                            <span className={clsx('hidden sm:flex items-center gap-0.5 text-xs shrink-0', prio.flagColor)}>
                              <Flag size={9} />{prio.label}
                            </span>
                          )}
                        </div>

                        {/* Project chip */}
                        {project && (
                          <div className="w-32 shrink-0 hidden lg:flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                            <span className="text-xs text-text-muted truncate">{project.name}</span>
                          </div>
                        )}

                        {/* Client */}
                        {client && (
                          <span className="w-28 shrink-0 text-xs text-text-muted truncate hidden md:block">
                            {client.companyName}
                          </span>
                        )}

                        {/* Due date */}
                        <span className={clsx('w-20 shrink-0 text-xs hidden sm:block', isOverdue ? 'text-red-400' : 'text-text-muted')}>
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                            : '—'}
                        </span>

                        {/* Assignee */}
                        {assignee ? (
                          <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0" title={assignee.name ?? assignee.email}>
                            <span className="text-[10px] font-semibold text-accent-blue">
                              {(assignee.name ?? assignee.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-dashed border-zinc-700 shrink-0" />
                        )}
                      </div>
                    )
                  })}

                  {groupTasks.length === 0 && (
                    <div className="px-4 py-3 bg-surface-0 text-xs text-text-muted italic">Geen taken</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Project Card ───────────────────────────────────────────────────────────────

function ProjectCard({ project, clientName, taskCount, onClick, onEdit }: {
  project: Project
  clientName: string
  taskCount: number
  onClick: () => void
  onEdit: () => void
}) {
  const statusCfg = PROJECT_STATUS_CONFIG[project.status]

  return (
    <div
      onClick={onClick}
      className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 hover:bg-white/[0.01] transition-all group relative"
    >
      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: project.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors leading-snug">
            {project.name}
          </h3>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all p-0.5 rounded shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>

        <p className="text-xs text-text-muted mb-3">{clientName}</p>

        {project.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3">{project.description}</p>
        )}

        <div className="flex items-center justify-between">
          <span className={clsx('text-xs px-2 py-0.5 rounded-full border', statusCfg.cls)}>
            {statusCfg.label}
          </span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Folder size={11} />
            {taskCount} {taskCount === 1 ? 'taak' : 'taken'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Activity Row ───────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  task_created:    'maakte taak aan',
  status_changed:  'wijzigde status',
  commented:       'voegde opmerking toe',
  assigned:        'wees taak toe',
  sprint_changed:  'wijzigde sprint',
  task_deleted:    'verwijderde taak',
}

function ActivityRow({ activity }: { activity: ProjectActivity }) {
  const actor = activity.actorEmail.split('@')[0]
  const label = ACTION_LABELS[activity.action] ?? activity.action
  const meta = activity.metadata ?? {}
  const taskTitle = typeof meta.taskTitle === 'string' ? meta.taskTitle : undefined
  const newStatus = typeof meta.newStatus === 'string' ? meta.newStatus : undefined

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-subtle/50 last:border-0">
      <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-accent-blue">{actor.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary">
          <span className="text-text-primary font-medium">{actor}</span>
          {' '}{label}
          {taskTitle && <span className="text-text-muted"> op &ldquo;<span className="text-text-secondary">{taskTitle}</span>&rdquo;</span>}
          {activity.action === 'status_changed' && newStatus && (
            <span className="text-text-muted"> → {newStatus}</span>
          )}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: nl })}
        </p>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function Projects() {
  usePageMeta('Projecten → Flits Impact', 'Beheer projecten en taken per klant in kanban of lijstweergave.')
  const clients = useStore(s => s.clients)
  const profile = useAuthStore(s => s.profile)

  const {
    projects, setProjects,
    tasks, setTasks,
    taskCounts, setTaskCounts,
    profiles,
    loading,
    allTasks, setAllTasks,
    allTasksLoading,
    loadAll,
    loadProjectTasks,
    loadAllTasks,
    updateTaskStatus,
  } = useProjectsData()

  // Navigation state
  const [leftNav, setLeftNav] = useState<'projects' | 'overview'>('projects')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // View toggle
  const [boardView, setBoardView] = useState<'kanban' | 'list' | 'activity'>('kanban')

  // Sprints state
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'all'>('all')
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [editSprint, setEditSprint] = useState<Sprint | undefined>()

  // Activity state
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Modal state
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | undefined>()
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>('todo')

  function openOverview() {
    setLeftNav('overview')
    setSelectedClientId(null)
    loadAllTasks()
  }

  function openProject(project: Project) {
    setSelectedProject(project)
    loadProjectTasks(project.id)
    // Load sprints for this project
    projectsDb.fetchSprints(project.id).then(setSprints).catch(() => {})
    setSelectedSprintId('all')
    setBoardView('kanban')
  }

  const loadActivity = useCallback(async (projectId: string) => {
    setActivityLoading(true)
    try {
      const data = await projectsDb.fetchProjectActivity(projectId)
      setActivities(data)
    } catch {
      // silent
    } finally {
      setActivityLoading(false)
    }
  }, [])

  function handleProjectSaved(p: Project) {
    setProjects(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next }
      return [p, ...prev]
    })
    if (selectedProject?.id === p.id) setSelectedProject(p)
    loadAll() // refresh task counts
  }

  function handleProjectDeleted(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (selectedProject?.id === id) setSelectedProject(null)
  }

  function handleTaskSaved(task: Task) {
    setTasks(prev => {
      const idx = prev.findIndex(x => x.id === task.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = task; return next }
      return [...prev, task]
    })
    setTaskCounts(prev => ({
      ...prev,
      [task.projectId]: (prev[task.projectId] ?? 0) + (editTask ? 0 : 1),
    }))
  }

  function handleTaskDeleted(id: string) {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    if (task) {
      setTaskCounts(prev => ({ ...prev, [task.projectId]: Math.max(0, (prev[task.projectId] ?? 1) - 1) }))
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find(t => t.id === taskId)
    await updateTaskStatus(taskId, newStatus)
    if (selectedProject && profile?.email && task) {
      const statusLabel = TASK_STATUSES.find(s => s.id === newStatus)?.label ?? newStatus
      projectsDb.logActivity({
        projectId: selectedProject.id,
        taskId,
        actorEmail: profile.email,
        action: 'status_changed',
        metadata: { taskTitle: task.title, newStatus: statusLabel },
      })
    }
  }

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return projects
    return projects.filter(p => p.clientId === selectedClientId)
  }, [projects, selectedClientId])

  // Client list with counts
  const clientsWithProjects = useMemo(() => {
    const counts: Record<string, number> = {}
    projects.forEach(p => { counts[p.clientId] = (counts[p.clientId] ?? 0) + 1 })
    return clients.filter(c => counts[c.id]).map(c => ({ ...c, count: counts[c.id] ?? 0 }))
  }, [clients, projects])

  // ── Board view ─────────────────────────────────────────────────────────────

  // Sprint-filtered tasks
  const sprintFilteredTasks = useMemo(() => {
    if (selectedSprintId === 'all') return tasks
    if (selectedSprintId === '__none__') return tasks.filter(t => !(t as Task & { sprintId?: string }).sprintId)
    return tasks.filter(t => (t as Task & { sprintId?: string }).sprintId === selectedSprintId)
  }, [tasks, selectedSprintId])

  if (selectedProject) {
    const client = clients.find(c => c.id === selectedProject.clientId)
    const activeSprint = sprints.find(s => s.status === 'active')
    return (
      <div className="flex flex-col h-full">
        {/* Board header */}
        <div className="flex items-center gap-2 px-4 lg:px-6 py-3 lg:py-[13px] border-b border-border-subtle shrink-0 flex-wrap">
          <button
            onClick={() => { setSelectedProject(null); setTasks([]); setSprints([]) }}
            className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors text-sm"
          >
            <ChevronLeft size={14} />
            Projecten
          </button>
          <span className="text-text-muted text-sm">/</span>
          <span className="text-sm text-text-muted hover:text-text-secondary cursor-default">{client?.companyName}</span>
          <span className="text-text-muted text-sm">/</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color }} />
            <span className="text-sm font-semibold text-text-primary">{selectedProject.name}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Sprint selector */}
            {sprints.length > 0 && (
              <select
                value={selectedSprintId}
                onChange={e => setSelectedSprintId(e.target.value)}
                className="text-xs px-2 py-1.5 bg-surface-0 border border-border-subtle rounded-lg text-text-secondary hover:border-zinc-600 transition-colors focus:outline-none"
              >
                <option value="all">Alle sprints</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.status === 'active' ? '(actief)' : ''}</option>
                ))}
                <option value="__none__">Geen sprint</option>
              </select>
            )}

            {/* View toggle */}
            <div className="flex items-center bg-surface-0 border border-border-subtle rounded-lg p-0.5">
              <button
                onClick={() => setBoardView('kanban')}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'kanban' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <LayoutGrid size={13} />
                Board
              </button>
              <button
                onClick={() => setBoardView('list')}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'list' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <List size={13} />
                Lijst
              </button>
              <button
                onClick={() => { setBoardView('activity'); loadActivity(selectedProject.id) }}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors',
                  boardView === 'activity' ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <Activity size={13} />
                Activiteit
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditProject(selectedProject); setShowProjectModal(true) }}
              className="h-7 text-xs"
            >
              Bewerken
            </Button>
            {boardView !== 'activity' && (
              <Button
                size="sm"
                onClick={() => { setEditTask(undefined); setTaskDefaultStatus('todo'); setShowTaskModal(true) }}
                className="h-7 text-xs gap-1.5"
              >
                <Plus size={13} />
                Taak
              </Button>
            )}
          </div>
        </div>

        {/* Sprint info bar */}
        {activeSprint && selectedSprintId === 'all' && (
          <div className="px-6 py-2 border-b border-border-subtle bg-blue-500/[0.04] flex items-center gap-2 shrink-0">
            <Zap size={12} className="text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">{activeSprint.name} loopt</span>
            {activeSprint.endDate && (
              <span className="text-xs text-text-muted">
                t/m {format(new Date(activeSprint.endDate + 'T00:00:00'), 'd MMM', { locale: nl })}
              </span>
            )}
          </div>
        )}

        {/* Board / List / Activity */}
        <div className={clsx('flex-1 px-4 lg:px-6 pt-4 lg:pt-5', boardView === 'kanban' ? 'overflow-hidden' : 'overflow-y-auto')}>
          {boardView === 'kanban' ? (
            <KanbanBoard
              tasks={sprintFilteredTasks}
              profiles={profiles}
              onTaskClick={task => { setEditTask(task); setShowTaskModal(true) }}
              onAddTask={status => { setEditTask(undefined); setTaskDefaultStatus(status); setShowTaskModal(true) }}
              onStatusChange={handleStatusChange}
            />
          ) : boardView === 'list' ? (
            <ListView
              tasks={sprintFilteredTasks}
              profiles={profiles}
              onTaskClick={task => { setEditTask(task); setShowTaskModal(true) }}
              onAddTask={status => { setEditTask(undefined); setTaskDefaultStatus(status); setShowTaskModal(true) }}
            />
          ) : (
            /* Activity feed */
            <div className="max-w-xl pb-8">
              {activityLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity size={24} className="text-text-muted mb-3" />
                  <p className="text-sm text-text-secondary">Nog geen activiteit in dit project</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {activities.map((act) => (
                    <ActivityRow key={act.id} activity={act} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showProjectModal && (
          <ProjectModal
            project={editProject}
            onClose={() => { setShowProjectModal(false); setEditProject(undefined) }}
            onSaved={handleProjectSaved}
            onDeleted={handleProjectDeleted}
          />
        )}
        {showTaskModal && (
          <TaskModal
            task={editTask}
            projectId={selectedProject.id}
            defaultStatus={taskDefaultStatus}
            profiles={profiles}
            onClose={() => { setShowTaskModal(false); setEditTask(undefined) }}
            onSaved={(t) => {
              handleTaskSaved(t)
              // Log activity
              if (profile?.email) {
                projectsDb.logActivity({
                  projectId: selectedProject.id,
                  taskId: t.id,
                  actorEmail: profile.email,
                  action: editTask ? 'status_changed' : 'task_created',
                  metadata: { taskTitle: t.title },
                })
              }
            }}
            onDeleted={(id) => {
              handleTaskDeleted(id)
              if (profile?.email) {
                projectsDb.logActivity({
                  projectId: selectedProject.id,
                  taskId: id,
                  actorEmail: profile.email,
                  action: 'task_deleted',
                  metadata: {},
                })
              }
            }}
          />
        )}
      </div>
    )
  }

  // ── Projects list view ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Mobile project select */}
      <div className="lg:hidden border-b border-border-subtle px-4 py-3 flex items-center gap-2">
        <Select
          value={leftNav === 'overview' ? '__overview__' : (selectedClientId ?? '__all__')}
          onValueChange={(v) => {
            if (v === '__overview__') {
              openOverview()
            } else if (v === '__all__') {
              setLeftNav('projects')
              setSelectedClientId(null)
            } else {
              setLeftNav('projects')
              setSelectedClientId(v)
            }
          }}
        >
          <SelectTrigger className="h-9 text-sm flex-1">
            <span>
              {leftNav === 'overview'
                ? 'Alle taken'
                : selectedClientId
                  ? clients.find((c) => c.id === selectedClientId)?.companyName ?? 'Onbekend'
                  : `Alle klanten (${projects.length})`}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__overview__">Alle taken</SelectItem>
              <SelectItem value="__all__">Alle klanten ({projects.length})</SelectItem>
              {clientsWithProjects.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.companyName} ({c.count})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Left: nav (desktop only) */}
      <aside className="w-52 shrink-0 border-r border-border-subtle hidden lg:flex flex-col">
        {/* Overview section */}
        <div className="px-2 pt-3 pb-2 border-b border-border-subtle">
          <button
            onClick={openOverview}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              leftNav === 'overview' ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
            )}
          >
            <List size={14} strokeWidth={1.8} />
            Alle taken
          </button>
        </div>

        {/* Projects section */}
        <div className="px-4 py-2.5 border-b border-border-subtle">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Projecten</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <button
            onClick={() => { setLeftNav('projects'); setSelectedClientId(null) }}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
              leftNav === 'projects' && !selectedClientId ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
            )}
          >
            <span>Alle klanten</span>
            <span className="text-xs text-text-muted">{projects.length}</span>
          </button>
          {clientsWithProjects.map(c => (
            <button
              key={c.id}
              onClick={() => { setLeftNav('projects'); setSelectedClientId(c.id) }}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                leftNav === 'projects' && selectedClientId === c.id ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              )}
            >
              <span className="truncate text-left">{c.companyName}</span>
              <span className="text-xs text-text-muted ml-2 shrink-0">{c.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Right: overview OR project grid */}
      <main className="flex-1 overflow-y-auto">
        {leftNav === 'overview' ? (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 lg:px-6 py-3 lg:py-[13px] border-b border-border-subtle bg-surface-0/80 backdrop-blur-md">
              <div>
                <h1 className="text-sm font-semibold text-text-primary">Alle taken</h1>
                <p className="text-xs text-text-muted mt-0.5">{allTasks.length} taken over {projects.length} projecten</p>
              </div>
            </div>
            <div className="p-4 lg:p-5">
              {allTasksLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <AllTasksView
                  tasks={allTasks}
                  projects={projects}
                  clients={clients}
                  profiles={profiles}
                  currentUserId={profile?.id}
                  onTaskClick={task => { setEditTask(task); setShowTaskModal(true) }}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 lg:px-6 py-3 lg:py-[13px] border-b border-border-subtle bg-surface-0/80 backdrop-blur-md">
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-text-primary truncate">
                  {selectedClientId ? clients.find(c => c.id === selectedClientId)?.companyName : 'Projecten'}
                </h1>
                <p className="text-xs text-text-muted mt-0.5">{filteredProjects.length} projecten</p>
              </div>
              <Button size="sm" onClick={() => { setEditProject(undefined); setShowProjectModal(true) }} className="shrink-0">
                <Plus size={13} />
                <span className="hidden sm:inline">Nieuw project</span>
                <span className="sm:hidden">Nieuw</span>
              </Button>
            </div>

            <div className="p-4 lg:p-6">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-border-subtle flex items-center justify-center mb-4">
                    <Folder size={20} className="text-text-muted" />
                  </div>
                  <p className="text-sm text-text-secondary font-medium mb-1">Geen projecten</p>
                  <p className="text-xs text-text-muted">Maak een nieuw project aan om te beginnen</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      clientName={clients.find(c => c.id === project.clientId)?.companyName ?? '—'}
                      taskCount={taskCounts[project.id] ?? 0}
                      onClick={() => openProject(project)}
                      onEdit={() => { setEditProject(project); setShowProjectModal(true) }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showProjectModal && (
        <ProjectModal
          project={editProject}
          clientId={selectedClientId ?? undefined}
          onClose={() => { setShowProjectModal(false); setEditProject(undefined) }}
          onSaved={handleProjectSaved}
          onDeleted={handleProjectDeleted}
        />
      )}
      {showTaskModal && editTask && (
        <TaskModal
          task={editTask}
          projectId={editTask.projectId}
          profiles={profiles}
          onClose={() => { setShowTaskModal(false); setEditTask(undefined) }}
          onSaved={t => {
            // Update in allTasks if overview is open
            setAllTasks(prev => prev.map(x => x.id === t.id ? t : x))
            handleTaskSaved(t)
          }}
          onDeleted={id => {
            setAllTasks(prev => prev.filter(x => x.id !== id))
            handleTaskDeleted(id)
          }}
        />
      )}
    </div>
  )
}
