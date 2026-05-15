import { useState, useRef } from 'react'
import { X, Plus, Check, ChevronDown, ChevronRight, Calendar, Trash2, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { MentionTextarea, parseMentions } from './MentionTextarea'
import { useTodosData } from '../hooks/useTodosData'
import { useTeamProfiles } from '../contexts/ProfilesProvider'
import { useUIStore } from '../store/useUIStore'
import { useNotifications } from '../hooks/useNotifications'
import { notificationsDb } from '../lib/notificationsDb'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import type { Todo } from '../lib/todosDb'
import clsx from 'clsx'

// ── New todo form ──────────────────────────────────────────────────────────────

function AddTodoForm({ onAdd }: { onAdd: (title: string, dueDate?: string | null) => void }) {
  const [title, setTitle] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    if (!title.trim()) return
    onAdd(title.trim(), dueDate || null)
    setTitle('')
    setDueDate('')
    setExpanded(false)
  }

  return (
    <div className="border-b border-border-subtle pb-3 mb-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded border border-zinc-600 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'ArrowDown' || title) setExpanded(true)
          }}
          placeholder="Taak toevoegen..."
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-zinc-600 focus:outline-none"
        />
        {title && (
          <button type="button" onClick={submit} className="text-accent-blue hover:text-blue-400 transition-colors">
            <Plus size={15} />
          </button>
        )}
      </div>

      {title && (
        <div className="flex items-center gap-2 mt-2 pl-6">
          <DatePickerButton
            value={dueDate || undefined}
            onChange={setDueDate}
            placeholder="Deadline"
            className="text-xs h-6 px-2 rounded border-border-subtle bg-white/[0.04] hover:bg-white/[0.08]"
          />
        </div>
      )}
    </div>
  )
}

// ── Todo row ───────────────────────────────────────────────────────────────────

function TodoRow({
  todo,
  onToggle,
  onDelete,
  onUpdateNotes,
  reloadNotifs,
}: {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  onUpdateNotes: (notes: string) => void
  reloadNotifs: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const profile = useAuthStore((s) => s.profile)
  const { profiles: teamProfiles } = useTeamProfiles()

  const isOverdue =
    todo.dueDate && !todo.done && new Date(todo.dueDate + 'T00:00:00') < new Date()

  async function handleNotesBlur() {
    if (notes !== (todo.notes ?? '')) {
      onUpdateNotes(notes)

      // Process @mentions
      if (profile?.email) {
        try {
          const emails = parseMentions(notes, teamProfiles)
          for (const email of emails) {
            const target = teamProfiles.find((p) => p.email === email)
            if (!target || target.email === profile.email) continue
            await notificationsDb.create({
              userId: target.id,
              actorEmail: profile.email,
              type: 'mention',
              content: `${profile.name ?? profile.email} noemde jou in een todo: "${todo.title}"`,
              linkedType: 'todo',
              linkedId: todo.id,
            })
          }
          reloadNotifs()
        } catch {
          // non-critical
        }
      }
    }
  }

  return (
    <div className="group">
      <div className="flex items-start gap-2 py-1.5">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={clsx(
            'mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
            todo.done ? 'bg-green-500 border-green-500' : 'border-zinc-600 hover:border-zinc-400',
          )}
        >
          {todo.done && <Check size={9} className="text-white" />}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-left w-full"
          >
            <span
              className={clsx(
                'text-sm block leading-snug',
                todo.done ? 'line-through text-text-muted' : 'text-text-primary',
              )}
            >
              {todo.title}
            </span>
          </button>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {todo.linkedLabel && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted border border-border-subtle">
                <Link2 size={9} />
                {todo.linkedLabel}
              </span>
            )}
            {todo.dueDate && (
              <span
                className={clsx(
                  'inline-flex items-center gap-0.5 text-[10px]',
                  isOverdue ? 'text-red-400' : 'text-text-muted',
                )}
              >
                <Calendar size={9} />
                {format(new Date(todo.dueDate + 'T00:00:00'), 'd MMM', { locale: nl })}
              </span>
            )}
          </div>

          {/* Expanded: notes */}
          {expanded && (
            <div className="mt-2 pl-0.5">
              <MentionTextarea
                value={notes}
                onChange={setNotes}
                onBlur={handleNotesBlur}
                placeholder="Notities... gebruik @ om iemand te taggen"
                rows={2}
                className="text-xs border border-border-subtle rounded-md px-2 py-1.5 bg-white/[0.03] focus:border-zinc-600 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Expand + delete */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-text-muted hover:text-text-secondary p-0.5 rounded transition-colors"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-text-muted hover:text-red-400 p-0.5 rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main sheet ─────────────────────────────────────────────────────────────────

export function TodoSheet() {
  const todoOpen = useUIStore((s) => s.todoOpen)
  const closeTodo = useUIStore((s) => s.closeTodo)
  const { todos, loading, addTodo, toggleDone, updateNotes, deleteTodo } = useTodosData()
  const { reload: reloadNotifs } = useNotifications()
  const [showDone, setShowDone] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const todayTodos = todos.filter(
    (t) => !t.done && t.dueDate && t.dueDate <= today,
  )
  const laterTodos = todos.filter(
    (t) => !t.done && (!t.dueDate || t.dueDate > today),
  )
  const doneTodos = todos.filter((t) => t.done)

  async function handleAdd(title: string, dueDate?: string | null) {
    await addTodo({ title, dueDate })
  }

  return (
    <Sheet open={todoOpen} onOpenChange={(v) => !v && closeTodo()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] sm:max-w-[400px] p-0 flex flex-col bg-surface-1 border-border-subtle"
      >
        <SheetHeader className="px-4 py-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-text-primary">Taken</SheetTitle>
            <Button variant="ghost" size="icon" onClick={closeTodo} className="h-6 w-6 text-text-muted">
              <X size={14} />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-1">
          <AddTodoForm onAdd={handleAdd} />

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Vandaag / overdue */}
          {todayTodos.length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1.5">
                Vandaag
              </p>
              <div className="divide-y divide-border-subtle/50">
                {todayTodos.map((t) => (
                  <TodoRow
                    key={t.id}
                    todo={t}
                    onToggle={() => toggleDone(t.id)}
                    onDelete={() => deleteTodo(t.id)}
                    onUpdateNotes={(n) => updateNotes(t.id, n)}
                    reloadNotifs={reloadNotifs}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Later */}
          {laterTodos.length > 0 && (
            <div className="mb-1">
              {todayTodos.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5 mt-3">
                  Later
                </p>
              )}
              <div className="divide-y divide-border-subtle/50">
                {laterTodos.map((t) => (
                  <TodoRow
                    key={t.id}
                    todo={t}
                    onToggle={() => toggleDone(t.id)}
                    onDelete={() => deleteTodo(t.id)}
                    onUpdateNotes={(n) => updateNotes(t.id, n)}
                    reloadNotifs={reloadNotifs}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && todos.filter((t) => !t.done).length === 0 && (
            <p className="text-xs text-text-muted text-center py-6">Geen openstaande taken</p>
          )}

          {/* Done (collapsible) */}
          {doneTodos.length > 0 && (
            <div className="mt-4 border-t border-border-subtle pt-3">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
              >
                {showDone ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                Voltooid ({doneTodos.length})
              </button>
              {showDone && (
                <div className="divide-y divide-border-subtle/50 mt-2">
                  {doneTodos.map((t) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      onToggle={() => toggleDone(t.id)}
                      onDelete={() => deleteTodo(t.id)}
                      onUpdateNotes={(n) => updateNotes(t.id, n)}
                      reloadNotifs={reloadNotifs}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
