import { supabase } from './supabase'
import { errorMessage } from './errors'
import { useAuthStore } from '../store/useAuthStore'

function anonHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  }
}

async function parseFunctionError(error: unknown): Promise<never> {
  const err = error as { context?: Response; message?: string }
  if (err?.context) {
    try {
      const body = await err.context.json() as { error?: string; message?: string }
      if (body?.error) throw new Error(body.error)
      if (body?.message) throw new Error(body.message)
    } catch (e) {
      if (e instanceof Error && e.message !== err.message) throw e
    }
  }
  throw new Error(errorMessage(error))
}

function sessionToken(): string | undefined {
  return useAuthStore.getState().session?.access_token
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const token = sessionToken()
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: token
      ? { ...anonHeaders(), Authorization: `Bearer ${token}` }
      : anonHeaders(),
  })

  if (error) await parseFunctionError(error)
  if (data?.error) throw new Error(data.error as string)
  return data as T
}

async function invokePublicFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: anonHeaders(),
  })

  if (error) await parseFunctionError(error)
  if (data?.error) throw new Error(data.error as string)
  return data as T
}

export const adminUsersApi = {
  create(input: {
    email: string
    password: string
    name?: string | null
    role: string
    allowed_pages: string[]
    allowed_features: string[]
  }) {
    return invokeFunction<{ userId: string }>('admin-users', { action: 'create', ...input })
  },

  update(input: {
    userId: string
    name?: string | null
    role: string
    allowed_pages: string[]
    allowed_features: string[]
    password?: string
  }) {
    return invokeFunction<{ ok: boolean }>('admin-users', { action: 'update', ...input })
  },

  delete(userId: string) {
    return invokeFunction<{ ok: boolean }>('admin-users', { action: 'delete', userId })
  },
}

/** Public post preview — no login; post id in URL is sufficient. */
export const postPreviewApi = {
  get(postId: string) {
    return invokePublicFunction<{
      post: {
        id: string
        client_id: string
        caption: string
        media_url: string | null
        media_urls?: string[] | null
        date: string | null
        type: string
        status: string
      }
      clientName: string
    }>('post-preview', { action: 'get', postId })
  },

  approve(postId: string) {
    return invokePublicFunction<{ ok: boolean; alreadyApproved?: boolean }>('post-preview', {
      action: 'approve',
      postId,
    })
  },
}
