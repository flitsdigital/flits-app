import { create } from 'zustand'
import type { Client, InvoiceRecord, Post } from '../types'
import { enrichClient } from '../lib/billing'
import { db, postDb } from '../lib/db'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function loadFromLocalStorage(): Client[] | null {
  try {
    const raw = localStorage.getItem('agency-crm-v1')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.clients ?? null
  } catch {
    return null
  }
}

type PostInput = Omit<Post, 'id' | 'createdAt' | 'updatedAt'>

interface StoreState {
  clients: Client[]
  posts: Post[]
  initialized: boolean
  error: string | null
  fetchClients: () => Promise<void>
  addClient: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'nextInvoiceDate' | 'lastInvoiceDate'>) => Promise<void>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  getClient: (id: string) => Client | undefined
  toggleInvoiced: (clientId: string, date: string) => Promise<void>
  addPost: (data: PostInput) => Promise<void>
  updatePost: (id: string, data: Partial<Post>) => Promise<void>
  deletePost: (id: string) => Promise<void>
}

export const useStore = create<StoreState>()((set, get) => ({
  clients: [],
  posts: [],
  initialized: false,
  error: null,

  fetchClients: async () => {
    try {
      let clients = await db.fetchAll()

      // Migreer lokale data naar Supabase als de database leeg is
      if (clients.length === 0) {
        const local = loadFromLocalStorage()
        if (local && local.length > 0) {
          const enriched = local.map((c) => enrichClient(c))
          await db.upsertMany(enriched)
          clients = await db.fetchAll()
          localStorage.removeItem('agency-crm-v1')
        }
      }

      const posts = await postDb.fetchAll()
      set({ clients, posts, initialized: true, error: null })
    } catch (e) {
      set({ initialized: true, error: e instanceof Error ? e.message : String(e) })
    }
  },

  addClient: async (data) => {
    const client = enrichClient({
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Client)
    set((s) => ({ clients: [...s.clients, client].sort((a, b) => a.companyName.localeCompare(b.companyName)) }))
    await db.upsert(client)
  },

  updateClient: async (id, data) => {
    set((s) => ({
      clients: s.clients.map((c) => {
        if (c.id !== id) return c
        return enrichClient({ ...c, ...data, id, updatedAt: new Date().toISOString() })
      }),
    }))
    const updated = get().clients.find((c) => c.id === id)
    if (updated) await db.upsert(updated)
  },

  deleteClient: async (id) => {
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
    await db.delete(id)
  },

  getClient: (id) => get().clients.find((c) => c.id === id),

  addPost: async (data) => {
    const post: Post = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => ({ posts: [post, ...s.posts] }))
    await postDb.upsert(post)
  },

  updatePost: async (id, data) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      ),
    }))
    const updated = get().posts.find((p) => p.id === id)
    if (updated) await postDb.upsert(updated)
  },

  deletePost: async (id) => {
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }))
    await postDb.delete(id)
  },

  toggleInvoiced: async (clientId, date) => {
    set((s) => ({
      clients: s.clients.map((c) => {
        if (c.id !== clientId) return c
        const records: InvoiceRecord[] = c.invoiceRecords ?? []
        const existing = records.find((r) => r.date === date)
        let newRecords: InvoiceRecord[]
        if (existing) {
          newRecords = records.map((r) =>
            r.date === date
              ? { ...r, invoiced: !r.invoiced, invoicedAt: !r.invoiced ? new Date().toISOString() : undefined }
              : r
          )
        } else {
          newRecords = [...records, { date, invoiced: true, invoicedAt: new Date().toISOString() }]
        }
        return { ...c, invoiceRecords: newRecords, updatedAt: new Date().toISOString() }
      }),
    }))
    const updated = get().clients.find((c) => c.id === clientId)
    if (updated) await db.upsert(updated)
  },
}))
