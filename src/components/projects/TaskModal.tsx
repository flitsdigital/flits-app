import { useState, useEffect } from 'react'
import { Plus, X, Trash2, Check, Flag, Send, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { projectsDb, type TaskComment } from '../../lib/projectsDb'
import { useAuthStore } from '../../store/useAuthStore'
import { notificationsDb } from '../../lib/notificationsDb'
import { errorMessage } from '../../lib/errors'
import { parseMentions, MentionTextarea } from '../MentionTextarea'
import clsx from 'clsx'
import type { Milestone, Task, Subtask, TaskStatus, TaskPriority } from '../../types'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PillDropdown } from '@/components/ui/pill-dropdown'
import { UserAvatar } from '../UserAvatar'
import { TASK_STATUSES, PRIORITY_CONFIG } from './projectsPageConstants'
import { TaskDatePicker } from './projectsPageComboboxes'

export function TaskModal({
  task,
  projectId,
  defaultStatus = 'todo',
  profiles,
  milestones = [],
  defaultMilestoneId,
  onClose,
  onSaved,
  onDeleted,
}: {
  task?: Task
  projectId: string
  defaultStatus?: TaskStatus
  profiles: UserProfileLite[]
  milestones?: Milestone[]
  defaultMilestoneId?: string | null
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
  const [milestoneId, setMilestoneId] = useState(task?.milestoneId ?? defaultMilestoneId ?? '')
  const [startDate, setStartDate] = useState(task?.startDate ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const modalProfile = useAuthStore((s) => s.profile)

  useEffect(() => {
    if (isEdit) {
      void loadSubtasks()
      void loadComments()
    }
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
      setComments((prev) => [...prev, comment])
      setNewComment('')

      const allProfiles = await projectsDb.fetchProfilesBasic()
      const emails = parseMentions(newComment.trim(), allProfiles)
      for (const email of emails) {
        const target = allProfiles.find((p) => p.email === email)
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
    setLoading(true)
    setError(null)
    try {
      const saved = await projectsDb.saveTask({
        id: task?.id,
        projectId,
        milestoneId: milestoneId || null,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        startDate: startDate || null,
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
    if (!task) return
    setLoading(true)
    try {
      await projectsDb.deleteTask(task.id)
    } catch (err: unknown) {
      setError(errorMessage(err))
      setLoading(false)
      return
    }
    onDeleted?.(task.id)
    onClose()
  }

  async function addSubtask() {
    if (!newSubtask.trim() || !task) return
    try {
      const data = await projectsDb.addSubtask(task.id, newSubtask.trim(), subtasks.length)
      setSubtasks((prev) => [...prev, data])
    } catch {
      return
    }
    setNewSubtask('')
  }

  async function toggleSubtask(s: Subtask) {
    await projectsDb.toggleSubtaskDone(s.id, !s.done)
    setSubtasks((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))
  }

  async function deleteSubtask(id: string) {
    await projectsDb.deleteSubtask(id)
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const assignee = profiles.find((p) => p.id === assigneeId)

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 flex flex-col max-h-[85vh] overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">{isEdit ? 'Taak bewerken' : 'Nieuwe taak'}</DialogTitle>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle shrink-0">
          <span className="text-xs text-text-muted">Projecten</span>
          <span className="text-text-muted">›</span>
          <span className="text-xs text-text-muted">{isEdit ? 'Taak bewerken' : 'Nieuwe taak'}</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto h-6 w-6 text-text-muted">
            <X size={15} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit()
              }}
              autoFocus
              placeholder="Taaknaam..."
              className="w-full bg-transparent text-base font-medium text-text-primary placeholder-zinc-600 focus:outline-none resize-none"
            />
          </div>

          <div className="px-5 pb-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Voeg een beschrijving toe..."
              className="w-full bg-transparent text-sm text-text-secondary placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {isEdit && (
            <div className="px-5 pb-4 border-t border-border-subtle pt-3">
              <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
                Subtaken
                {subtasks.length > 0 && (
                  <span className="ml-1.5 font-normal">
                    {subtasks.filter((s) => s.done).length}/{subtasks.length}
                  </span>
                )}
              </p>
              <div className="space-y-1 mb-2">
                {subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 group py-0.5">
                    <button
                      type="button"
                      onClick={() => void toggleSubtask(s)}
                      className={clsx(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        s.done ? 'bg-green-500 border-green-500' : 'border-zinc-600 hover:border-zinc-400'
                      )}
                    >
                      {s.done && <Check size={9} className="text-white" />}
                    </button>
                    <span className={clsx('text-sm flex-1', s.done ? 'line-through text-text-muted' : 'text-text-primary')}>{s.title}</span>
                    <button
                      type="button"
                      onClick={() => void deleteSubtask(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void addSubtask()
                    }
                  }}
                  placeholder="Subtaak toevoegen..."
                  className="flex-1 px-2.5 py-1 bg-white/[0.04] border border-border-subtle rounded-md text-sm text-text-primary placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => void addSubtask()}
                  disabled={!newSubtask.trim()}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary rounded-md transition-colors disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="px-5 pb-4 border-t border-border-subtle pt-3">
              <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare size={11} />
                Opmerkingen
                {comments.length > 0 && <span className="font-normal">({comments.length})</span>}
              </p>

              {comments.length > 0 && (
                <div className="space-y-3 mb-3">
                  {comments.map((c) => {
                    const name = c.authorName ?? c.authorEmail.split('@')[0]
                    const commenterProfile = profiles.find((p) => p.email === c.authorEmail)
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <UserAvatar
                          profile={commenterProfile ?? { email: c.authorEmail, name: c.authorName }}
                          size="w-6 h-6"
                          textSize="text-[9px]"
                          className="shrink-0"
                        />
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

              <div className="flex gap-2 items-start">
                <UserAvatar profile={modalProfile} size="w-6 h-6" textSize="text-[9px]" className="shrink-0 mt-0.5" />
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
                  onClick={() => void addComment()}
                  disabled={!newComment.trim() || commentLoading}
                  className="p-1.5 bg-accent-blue hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-40 shrink-0 mt-0.5"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle px-4 py-3 flex items-center gap-1.5 flex-wrap">
          <PillDropdown<TaskStatus>
            options={TASK_STATUSES.map((s) => s.id)}
            value={status}
            onChange={setStatus}
            renderLabel={(v) => {
              const s = TASK_STATUSES.find((x) => x.id === v)!
              return (
                <>
                  <s.Icon size={12} className={s.color} />
                  <span>{s.label}</span>
                </>
              )
            }}
            renderOption={(v) => {
              const s = TASK_STATUSES.find((x) => x.id === v)!
              return (
                <>
                  <s.Icon size={12} className={s.color} />
                  <span>{s.label}</span>
                </>
              )
            }}
          />

          <PillDropdown<TaskPriority>
            options={['low', 'medium', 'high', 'urgent']}
            value={priority}
            onChange={setPriority}
            renderLabel={(v) => {
              const p = PRIORITY_CONFIG[v]
              return (
                <>
                  <Flag size={11} className={p.flagColor} />
                  <span className={p.color}>{p.label}</span>
                </>
              )
            }}
            renderOption={(v) => {
              const p = PRIORITY_CONFIG[v]
              return (
                <>
                  <Flag size={11} className={p.flagColor} />
                  <span>{p.label}</span>
                </>
              )
            }}
          />

          <PillDropdown<string>
            options={['__none__', ...profiles.map((p) => p.id)]}
            value={assigneeId || '__none__'}
            onChange={(v) => setAssigneeId(v === '__none__' ? '' : v)}
            renderLabel={() =>
              assignee ? (
                <>
                  <UserAvatar profile={assignee} size="w-4 h-4" textSize="text-[8px]" />
                  <span>{assignee.name ?? assignee.email.split('@')[0]}</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full border border-dashed border-zinc-600" />
                  <span className="text-zinc-500">Niemand</span>
                </>
              )
            }
            renderOption={(id) => {
              if (id === '__none__')
                return (
                  <>
                    <div className="w-4 h-4 rounded-full border border-dashed border-zinc-600" />
                    <span>Niemand</span>
                  </>
                )
              const p = profiles.find((x) => x.id === id)!
              return (
                <>
                  <UserAvatar profile={p} size="w-4 h-4" textSize="text-[8px]" />
                  <span>{p.name ?? p.email.split('@')[0]}</span>
                </>
              )
            }}
          />

          <TaskDatePicker value={startDate} onChange={setStartDate} />
          <span className="text-text-muted text-xs">→</span>
          <TaskDatePicker value={dueDate} onChange={setDueDate} />

          {milestones.length > 0 && (
            <PillDropdown<string>
              options={['__none__', ...milestones.map((m) => m.id)]}
              value={milestoneId || '__none__'}
              onChange={(v) => setMilestoneId(v === '__none__' ? '' : v)}
              renderLabel={() => {
                const m = milestones.find((x) => x.id === milestoneId)
                return m ? (
                  <>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span>{m.name}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full border border-dashed border-zinc-600" />
                    <span className="text-zinc-500">Milestone</span>
                  </>
                )
              }}
              renderOption={(id) => {
                if (id === '__none__')
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full border border-dashed border-zinc-600" />
                      <span>Geen milestone</span>
                    </>
                  )
                const m = milestones.find((x) => x.id === id)!
                return (
                  <>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span>{m.name}</span>
                  </>
                )
              }}
            />
          )}

          {error && <span className="text-xs text-red-400 ml-1">{error}</span>}

          <div className="ml-auto flex items-center gap-2">
            {isEdit &&
              (deleteConfirm ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Zeker?</span>
                  <button type="button" onClick={() => void handleDelete()} className="text-red-400 hover:text-red-300">
                    Ja
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="text-text-muted">
                    Nee
                  </button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteConfirm(true)} className="h-7 w-7 text-zinc-600 hover:text-destructive">
                  <Trash2 size={13} />
                </Button>
              ))}
            <Button type="button" size="sm" onClick={() => void handleSubmit()} disabled={loading || !title.trim()} className="h-7 text-xs">
              {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Taak aanmaken'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
