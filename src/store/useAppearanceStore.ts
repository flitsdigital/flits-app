import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AccentColor = 'blauw' | 'paars' | 'groen' | 'oranje' | 'roze' | 'rood' | 'cyaan'

export interface AccentOption {
  id: AccentColor
  label: string
  hex: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'blauw',   label: 'Blauw',   hex: '#4c6ef5' },
  { id: 'paars',   label: 'Paars',   hex: '#9b6dff' },
  { id: 'groen',   label: 'Groen',   hex: '#20c97e' },
  { id: 'oranje',  label: 'Oranje',  hex: '#f5a623' },
  { id: 'roze',    label: 'Roze',    hex: '#ec4899' },
  { id: 'rood',    label: 'Rood',    hex: '#e5484d' },
  { id: 'cyaan',   label: 'Cyaan',   hex: '#22d3ee' },
]

interface AppearanceStore {
  accent: AccentColor
  workspaceName: string
  setAccent: (accent: AccentColor) => void
  setWorkspaceName: (name: string) => void
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      accent: 'blauw',
      workspaceName: 'Flits Impact',

      setAccent: (accent) => {
        set({ accent })
        // Apply immediately to <html> element
        const el = document.documentElement
        if (accent === 'blauw') {
          el.removeAttribute('data-accent')
        } else {
          el.setAttribute('data-accent', accent)
        }
      },

      setWorkspaceName: (workspaceName) => set({ workspaceName }),
    }),
    { name: 'appearance' },
  ),
)

/** Call once on app boot to re-apply the persisted accent. */
export function applyPersistedAccent() {
  const { accent } = useAppearanceStore.getState()
  if (accent !== 'blauw') {
    document.documentElement.setAttribute('data-accent', accent)
  }
}
