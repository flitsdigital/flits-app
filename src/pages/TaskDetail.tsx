import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { projectsDb, type TaskComment, type Sprint } from '../lib/projectsDb'
import { timeTrackingDb } from '../lib/timeTrackingDb'
import { notificationsDb } from '../lib/notificationsDb'
import { parseMentions } from '../components/MentionTextarea'
import { PageHeader } from '../components/PageHeader'
import { SubtaskList } from '../components/projects/SubtaskList'
import { CommentThread } from '../components/projects/CommentThread'
import { TaskSidebar } from '../components/projects/TaskSidebar'
import { EmptyState } from '../components/EmptyState'
import type { Task, Subtask, TaskStatus, TaskPriority, ProjectLabel, TimeEntry } from '../types'
import type { UserProfileLite } from '../hooks/useProjectsData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function TaskDetail() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const clients = useStore((s) => s.clients)

  const [task, setTask] = useState<Task | null>(null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [profiles, setProfiles] = useState<UserProfileLite[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [labels, setLabels] = useState<ProjectLabel[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Inline editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  // Comments
  const [newComment, setNewComment] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  // Subtasks
  const [newSubtask, setNewSubtask] = useState('')

  // Time logging
  const [showTimeForm, setShowTimeForm] = useState(false)
  const [timeDesc, setTimeDesc] = useState('')
  const [timeHours, setTimeHours] = useState('')
  const [timeDate, setTimeDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeSaving, setTimeSaving] = useState(false)

  const load = useCallback(async () => {
    if (!taskId || !projectId) return
    setLoading(true)
    try {
      const [full, profileList, sprintList, labelList, entries] = await Promise.all([
        projectsDb.fetchTask(taskId),
        projectsDb.fetchProfilesBasic(),
        projectsDb.fetchSprints(projectId),
        projectsDb.fetchProjectLabels(projectId),
        timeTrackingDb.fetchEntriesForTask(taskId),
      ])
      setTask(full)
      setTitleDraft(full.title)
      setDescDraft(full.description ?? '')
      setSubtasks(full.subtasks)
      setComments(full.comments)
      setProfiles(profileList)
      setSprints(sprintList)
      setLabels(labelList)
      setTimeEntries(entries)
    } catch {
      toast.error('Taak niet gevonden')
      navigate('/projecten')
    } finally {
      setLoading(false)
    }
  }, [taskId, projectId, navigate])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus()
  }, [editingTitle])

  // Find project + client for breadcrumbs
  const [projectName, setProjectName] = useState<string>('')
  const [clientName, setClientName] = useState<string>('')
  const [clientId, setClientId] = useState<string | null>(null)
  useEffect(() => {
    if (!projectId) return
    projectsDb.fetchProjects().then((projects) => {
      const p = projects.find((x) => x.id === projectId)
      if (!p) return
      setProjectName(p.name)
      const c = clients.find((x) => x.id === p.clientId)
      if (c) { setClientName(c.companyName); setClientId(c.id) }
    })
  }, [projectId, clients])

  async function patchTask(patch: Partial<Task>) {
    if (!task) return
    const updated = { ...task, ...patch }
    setTask(updated)
    setSaving(true)
    try {
      await projectsDb.saveTask({
        id: task.id,
        projectId: task.projectId,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assigneeId,
        dueDate: updated.dueDate,
        sprintId: updated.sprintId,
      })
    } catch (err) {
      toast.error('Opslaan mislukt', { description: String(err) })
    } finally {
      setSaving(false)
    }
  }

  async function saveTitle() {
    if (!task || !titleDraft.trim()) return
    setEditingTitle(false)
    if (titleDraft !== task.title) await patchTask({ title: titleDraft.trim() })
  }

  async function saveDesc() {
    if (!task) return
    if (descDraft !== (task.description ?? '')) await patchTask({ description: descDraft || null })
  }

  async function handleLabelChange(ids: string[]) {
    if (!task) return
    setTask({ ...task, labelIds: ids })
    await projectsDb.setTaskLabels(task.id, ids)
  }

  async function handleCreateLabel(name: string, color: string) {
    if (!projectId) throw new Error('No project')
    const label = await projectsDb.createLabel(projectId, name, color)
    setLabels((prev) => [...prev, label])
    return label
  }

  async function handleDeleteLabel(id: string) {
    await projectsDb.deleteLabel(id)
    setLabels((prev) => prev.filter((l) => l.id !== id))
    if (task?.labelIds?.includes(id)) {
      const ids = task.labelIds.filter((x) => x !== id)
      setTask({ ...task, labelIds: ids })
      await projectsDb.setTaskLabels(task.id, ids)
    }
  }

  // Subtasks
  async function handleAddSubtask() {
    if (!task || !newSubtask.trim()) return
    const sub = await projectsDb.addSubtask(task.id, newSubtask.trim(), subtasks.length)
    setSubtasks((prev) => [...prev, sub])
    setNewSubtask('')
  }

  async function handleToggleSubtask(s: Subtask) {
    await projectsDb.toggleSubtaskDone(s.id, !s.done)
    setSubtasks((prev) => prev.map((x) => x.id === s.id ? { ...x, done: !x.done } : x))
  }

  async function handleDeleteSubtask(id: string) {
    await projectsDb.deleteSubtask(id)
    setSubtasks((prev) => prev.filter((x) => x.id !== id))
  }

  // Comments
  async function handleAddComment() {
    if (!task || !newComment.trim() || !profile) return
    setCommentSaving(true)
    try {
      const comment = await projectsDb.addTaskComment({
        taskId: task.id,
        authorId: profile.id,
        authorEmail: profile.email,
        authorName: profile.name,
        content: newComment.trim(),
      })
      setComments((prev) => [...prev, comment])
      // Mentions
      const mentionedEmails = parseMentions(newComment, profiles)
      for (const email of mentionedEmails) {
        const target = profiles.find((p) => p.email === email)
        if (!target) continue
        await notificationsDb.create({
          userId: target.id,
          actorEmail: profile.email,
          type: 'mention',
          content: newComment.trim().slice(0, 120),
          contextUrl: `/projecten/${task.projectId}/taken/${task.id}`,
        })
      }
      setNewComment('')
    } catch (err) {
      toast.error('Mislukt', { description: String(err) })
    } finally {
      setCommentSaving(false)
    }
  }

  // Time logging
  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault()
    if (!task || !profile || !timeHours) return
    const hours = parseFloat(timeHours)
    if (isNaN(hours) || hours <= 0) return
    setTimeSaving(true)
    try {
      // Convert hours to start/end timestamps on the selected date
      const start = new Date(`${timeDate}T09:00:00`)
      const end = new Date(start.getTime() + hours * 3600 * 1000)
      const entry = await timeTrackingDb.createEntry({
        userId: profile.id,
        clientId: null,
        projectId: task.projectId,
        taskId: task.id,
        description: timeDesc || task.title,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        tagIds: [],
      })
      setTimeEntries((prev) => [entry, ...prev])
      setTimeDesc('')
      setTimeHours('')
      setShowTimeForm(false)
      toast.success('Tijd gelogd')
    } catch (err) {
      toast.error('Mislukt', { description: String(err) })
    } finally {
      setTimeSaving(false)
    }
  }

  const totalHours = timeEntries.reduce((sum, e) => {
    if (!e.endedAt) return sum
    return sum + (new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 3_600_000
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!task) return <EmptyState title="Taak niet gevonden" />

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={task.title}
        breadcrumbs={[
          { label: 'Projecten', onClick: () => navigate('/projects') },
          ...(clientName ? [{ label: clientName, onClick: () => navigate('/projects', { state: { clientId } }) }] : []),
          ...(projectName ? [{ label: projectName, onClick: () => navigate('/projects', { state: { projectId } }) }] : []),
          { label: task.title },
        ]}
        actions={
          saving ? <span className="text-xs text-text-muted animate-pulse">Opslaan…</span> : undefined
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Title */}
          <div>
            {editingTitle ? (
              <Input
                ref={titleRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(task.title) } }}
                className="text-2xl font-semibold bg-transparent border-0 border-b border-accent-blue/50 rounded-none px-0 focus-visible:ring-0 h-auto py-1"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-2xl font-semibold text-text-primary cursor-text hover:text-white transition-colors"
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Description */}
          <div>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDesc}
              placeholder="Voeg een beschrijving toe…"
              rows={3}
              className="w-full text-sm text-text-secondary bg-transparent border-0 resize-none focus:outline-none placeholder-text-muted/50 leading-relaxed"
            />
          </div>

          <Separator className="bg-border-subtle" />

          {/* Subtasks */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Subtaken</h3>
            <SubtaskList
              subtasks={subtasks}
              newSubtask={newSubtask}
              onNewSubtaskChange={setNewSubtask}
              onAddSubtask={handleAddSubtask}
              onToggle={handleToggleSubtask}
              onDelete={handleDeleteSubtask}
            />
          </div>

          <Separator className="bg-border-subtle" />

          {/* Comments */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Opmerkingen {comments.length > 0 && <span className="font-normal normal-case">({comments.length})</span>}
            </h3>
            <CommentThread
              comments={comments}
              newComment={newComment}
              onNewCommentChange={setNewComment}
              onAddComment={handleAddComment}
              currentProfile={profile}
              allProfiles={profiles}
              submitting={commentSaving}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-64 shrink-0 border-l border-border-subtle overflow-y-auto p-4">
          <TaskSidebar
            task={task}
            profiles={profiles}
            labels={labels}
            sprints={sprints}
            onStatusChange={(s) => patchTask({ status: s as TaskStatus })}
            onPriorityChange={(p) => patchTask({ priority: p as TaskPriority })}
            onAssigneeChange={(id) => patchTask({ assigneeId: id })}
            onDueDateChange={(d) => patchTask({ dueDate: d })}
            onSprintChange={async (id) => {
              if (!task) return
              setTask({ ...task, sprintId: id })
              await projectsDb.updateTaskSprint(task.id, id)
            }}
            onLabelsChange={handleLabelChange}
            onCreateLabel={handleCreateLabel}
            onDeleteLabel={handleDeleteLabel}
            createdAt={task.createdAt}
            updatedAt={task.updatedAt}
          />

          <Separator className="bg-border-subtle my-4" />

          {/* Time tracking */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={11} /> Gelogde tijd
              </h3>
              <button
                type="button"
                onClick={() => setShowTimeForm((v) => !v)}
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            <p className="text-sm font-semibold text-text-primary mb-2">
              {totalHours.toFixed(1)}u totaal
            </p>

            {showTimeForm && (
              <form onSubmit={handleLogTime} className="space-y-2 mb-3 p-2.5 bg-surface-2 rounded-lg border border-border-subtle">
                <Input
                  type="date"
                  value={timeDate}
                  onChange={(e) => setTimeDate(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  placeholder="Uren (bijv. 1.5)"
                  value={timeHours}
                  onChange={(e) => setTimeHours(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Omschrijving (optioneel)"
                  value={timeDesc}
                  onChange={(e) => setTimeDesc(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex gap-1.5">
                  <Button type="submit" size="sm" className="h-6 text-xs flex-1" disabled={timeSaving || !timeHours}>Loggen</Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowTimeForm(false)}>Annuleer</Button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              {timeEntries.slice(0, 5).map((e) => {
                const hrs = e.endedAt
                  ? (new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 3_600_000
                  : 0
                return (
                  <div key={e.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{format(new Date(e.startedAt), 'd MMM', { locale: nl })}</span>
                    <span className="text-text-secondary font-medium">{hrs.toFixed(1)}u</span>
                  </div>
                )
              })}
              {timeEntries.length > 5 && (
                <p className="text-[10px] text-text-muted">+{timeEntries.length - 5} meer</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
