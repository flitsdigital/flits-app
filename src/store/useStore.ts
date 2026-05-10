import { create } from 'zustand'
import type { Client, ClientInvoice, InvoiceRecord, Post, PostLog } from '../types'
import { enrichClient } from '../lib/billing'
import { db, postDb, postLogDb, clientInvoiceDb } from '../lib/db'
import { errorMessage } from '../lib/errors'
import { useAuthStore } from './useAuthStore'

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
  clientInvoices: ClientInvoice[]
  initialized: boolean
  error: string | null
  fetchClients: () => Promise<void>
  addClient: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'nextInvoiceDate' | 'lastInvoiceDate'>) => Promise<Client>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  getClient: (id: string) => Client | undefined
  toggleInvoiced: (clientId: string, date: string) => Promise<void>
  addClientInvoice: (data: Omit<ClientInvoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ClientInvoice>
  updateClientInvoice: (id: string, data: Partial<ClientInvoice>) => Promise<void>
  deleteClientInvoice: (id: string) => Promise<void>
  addPost: (data: PostInput) => Promise<Post>
  addPostsBulk: (posts: PostInput[]) => Promise<Post[]>
  updatePost: (id: string, data: Partial<Post>) => Promise<void>
  deletePost: (id: string) => Promise<void>
}

export const useStore = create<StoreState>()((set, get) => ({
  clients: [],
  posts: [],
  clientInvoices: [],
  initialized: false,
  error: null,

  fetchClients: async () => {
    try {
      let clients = await db.fetchAll()

      // Migreer lokale data naar Supabase als de database leeg is
      if (clients.length === 0) {
        const local = loadFromLocalStorage()
        if (local && local.length > 0) {
          const enriched = local.map((c) =>
            enrichClient({
              ...(c as Client),
              clientType: (c as Client).clientType ?? 'recurring',
              billingCycle: (c as Client).billingCycle ?? '6_weeks',
              pricePerCycle:
                typeof (c as Client).pricePerCycle === 'number'
                  ? (c as Client).pricePerCycle
                  : 0,
            } as Client),
          )
          await db.upsertMany(enriched)
          clients = await db.fetchAll()
          localStorage.removeItem('agency-crm-v1')
        }
      }

      const [posts, clientInvoices] = await Promise.all([
        postDb.fetchAll(),
        clientInvoiceDb.fetchAll().catch(() => [] as ClientInvoice[]),
      ])
      set({ clients, posts, clientInvoices, initialized: true, error: null })
    } catch (e) {
      set({ initialized: true, error: errorMessage(e) })
    }
  },

  addClient: async (data) => {
    const now = new Date().toISOString()
    const client = enrichClient({
      ...data,
      clientType: data.clientType ?? 'recurring',
      billingCycle: data.billingCycle ?? '6_weeks',
      pricePerCycle: typeof data.pricePerCycle === 'number' ? data.pricePerCycle : 0,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    } as Client)
    set((s) => ({
      clients: [...s.clients, client].sort((a, b) =>
        a.companyName.localeCompare(b.companyName),
      ),
    }))
    await db.upsert(client)
    return client
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
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
      clientInvoices: s.clientInvoices.filter((i) => i.clientId !== id),
    }))
    await db.delete(id)
  },

  getClient: (id) => get().clients.find((c) => c.id === id),

  addPost: async (data) => {
    const actor = useAuthStore.getState().session?.user
    const post: Post = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => ({ posts: [post, ...s.posts] }))
    await postDb.upsert(post)
    await postLogDb.add({
      postId: post.id,
      action: 'created',
      actorEmail: actor?.email ?? undefined,
      actorId: actor?.id ?? undefined,
      metadata: { toStatus: post.status },
    })
    return post
  },

  addPostsBulk: async (postsInput) => {
    const actor = useAuthStore.getState().session?.user
    const now = new Date().toISOString()
    const posts: Post[] = postsInput.map((data) => ({
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }))
    // Optimistic update — add all at once
    set((s) => ({ posts: [...posts, ...s.posts] }))
    // Single batch insert for posts
    await postDb.upsertMany(posts)
    // Single batch insert for logs
    await postLogDb.addMany(
      posts.map((post) => ({
        postId: post.id,
        action: 'created' as const,
        actorEmail: actor?.email ?? undefined,
        actorId: actor?.id ?? undefined,
        metadata: { toStatus: post.status },
      }))
    )
    return posts
  },

  updatePost: async (id, data) => {
    const before = get().posts.find((p) => p.id === id)
    const actor = useAuthStore.getState().session?.user
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      ),
    }))
    const updated = get().posts.find((p) => p.id === id)
    if (updated) await postDb.upsert(updated)
    if (before && updated) {
      const mediaBefore = JSON.stringify(before.mediaUrls ?? (before.mediaUrl ? [before.mediaUrl] : []))
      const mediaAfter = JSON.stringify(updated.mediaUrls ?? (updated.mediaUrl ? [updated.mediaUrl] : []))
      const changes: NonNullable<PostLog['metadata']>['changes'] = []

      if (before.clientId !== updated.clientId) {
        changes.push({ field: 'clientId', from: before.clientId, to: updated.clientId })
      }
      if (before.type !== updated.type) {
        changes.push({ field: 'type', from: before.type, to: updated.type })
      }
      if (before.status !== updated.status) {
        changes.push({ field: 'status', from: before.status, to: updated.status })
      }
      if (before.caption !== updated.caption) {
        changes.push({ field: 'caption', from: before.caption ?? '', to: updated.caption ?? '' })
      }
      if ((before.date ?? '') !== (updated.date ?? '')) {
        changes.push({ field: 'date', from: before.date ?? '', to: updated.date ?? '' })
      }
      if (mediaBefore !== mediaAfter) {
        changes.push({ field: 'mediaUrls', from: mediaBefore, to: mediaAfter })
      }

      if (changes.length === 0) return

      if (changes.length === 1 && changes[0].field === 'status') {
        await postLogDb.add({
          postId: id,
          action: 'status_changed',
          actorEmail: actor?.email ?? undefined,
          actorId: actor?.id ?? undefined,
          metadata: {
            fromStatus: before.status,
            toStatus: updated.status,
            changes,
          },
        })
      } else {
        await postLogDb.add({
          postId: id,
          action: 'updated',
          actorEmail: actor?.email ?? undefined,
          actorId: actor?.id ?? undefined,
          metadata: { changes },
        })
      }
    }
  },

  deletePost: async (id) => {
    const actor = useAuthStore.getState().session?.user
    await postLogDb.add({
      postId: id,
      action: 'deleted',
      actorEmail: actor?.email ?? undefined,
      actorId: actor?.id ?? undefined,
    })
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }))
    await postDb.delete(id)
  },

  toggleInvoiced: async (clientId, date) => {
    const client = get().clients.find((c) => c.id === clientId)
    if (!client || (client.clientType ?? 'recurring') !== 'recurring') return
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

  addClientInvoice: async (data) => {
    const now = new Date().toISOString()
    const inv: ClientInvoice = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    set((s) => ({
      clientInvoices: [...s.clientInvoices, inv].sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate),
      ),
    }))
    await clientInvoiceDb.upsert(inv)
    return inv
  },

  updateClientInvoice: async (id, data) => {
    set((s) => ({
      clientInvoices: s.clientInvoices.map((i) =>
        i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i,
      ),
    }))
    const updated = get().clientInvoices.find((i) => i.id === id)
    if (updated) await clientInvoiceDb.upsert(updated)
  },

  deleteClientInvoice: async (id) => {
    set((s) => ({ clientInvoices: s.clientInvoices.filter((i) => i.id !== id) }))
    await clientInvoiceDb.delete(id)
  },
}))
