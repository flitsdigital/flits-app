import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ClientsTypeSegment = 'all' | 'recurring' | 'project' | 'oneoff'

interface UIState {
  todoOpen: boolean
  inboxOpen: boolean
  clientsTypeSegment: ClientsTypeSegment
  toggleTodo: () => void
  toggleInbox: () => void
  closeTodo: () => void
  closeInbox: () => void
  setClientsTypeSegment: (v: ClientsTypeSegment) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      todoOpen: false,
      inboxOpen: false,
      clientsTypeSegment: 'all' as ClientsTypeSegment,
      toggleTodo: () => set((s) => ({ todoOpen: !s.todoOpen, inboxOpen: false })),
      toggleInbox: () => set((s) => ({ inboxOpen: !s.inboxOpen, todoOpen: false })),
      closeTodo: () => set({ todoOpen: false }),
      closeInbox: () => set({ inboxOpen: false }),
      setClientsTypeSegment: (v) => set({ clientsTypeSegment: v }),
    }),
    { name: 'flits-ui', partialize: (s) => ({ clientsTypeSegment: s.clientsTypeSegment }) },
  ),
)
