import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { todosDb, type Todo } from '../lib/todosDb'
import { useAuthStore } from '../store/useAuthStore'

type TodosContextValue = {
  todos: Todo[]
  loading: boolean
  openCount: number
  addTodo: (input: {
    title: string
    dueDate?: string | null
    linkedType?: Todo['linkedType']
    linkedId?: string | null
    linkedLabel?: string | null
    notes?: string | null
  }) => Promise<Todo>
  toggleDone: (id: string) => Promise<void>
  updateNotes: (id: string, notes: string) => Promise<void>
  updateTodo: (
    id: string,
    patch: Partial<Pick<Todo, 'title' | 'dueDate' | 'linkedType' | 'linkedId' | 'linkedLabel' | 'notes'>>,
  ) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  reload: () => Promise<void>
}

const TodosContext = createContext<TodosContextValue | null>(null)

export function TodosProvider({ children }: { children: ReactNode }) {
  const profile = useAuthStore((s) => s.profile)
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const data = await todosDb.fetchForUser(profile.id)
      setTodos(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function addTodo(input: {
    title: string
    dueDate?: string | null
    linkedType?: Todo['linkedType']
    linkedId?: string | null
    linkedLabel?: string | null
    notes?: string | null
  }): Promise<Todo> {
    if (!profile?.id) throw new Error('No user')
    const todo = await todosDb.upsert({
      title: input.title,
      ownerId: profile.id,
      dueDate: input.dueDate,
      linkedType: input.linkedType,
      linkedId: input.linkedId,
      linkedLabel: input.linkedLabel,
      notes: input.notes,
      position: todos.length,
    })
    setTodos((prev) => [todo, ...prev])
    return todo
  }

  async function toggleDone(id: string) {
    const todo = todos.find((t) => t.id === id)
    if (!todo) return
    const next = !todo.done
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: next } : t)))
    await todosDb.toggleDone(id, next)
  }

  async function updateNotes(id: string, notes: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)))
    await todosDb.updateNotes(id, notes)
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await todosDb.delete(id)
  }

  async function updateTodo(
    id: string,
    patch: Partial<Pick<Todo, 'title' | 'dueDate' | 'linkedType' | 'linkedId' | 'linkedLabel' | 'notes'>>,
  ) {
    const todo = todos.find((t) => t.id === id)
    if (!todo || !profile?.id) return
    const updated = await todosDb.upsert({ ...todo, ...patch, ownerId: profile.id })
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const openCount = todos.filter((t) => !t.done).length

  const value: TodosContextValue = {
    todos,
    loading,
    openCount,
    addTodo,
    toggleDone,
    updateNotes,
    updateTodo,
    deleteTodo,
    reload: load,
  }

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
}

export function useTodosData() {
  const ctx = useContext(TodosContext)
  if (!ctx) {
    throw new Error('useTodosData must be used within TodosProvider')
  }
  return ctx
}
