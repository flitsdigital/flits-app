import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

// Admin client bypasses RLS — only used for admin user management operations.
// Lazy-initialised so a missing key doesn't crash the whole module on import.
let _admin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!_admin) {
    const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string
    if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is niet ingesteld in .env')
    _admin = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      key,
      { auth: { autoRefreshToken: false, persistSession: false, storageKey: 'sb-admin' } }
    )
  }
  return _admin
}

// Backwards-compat export voor bestaande imports
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (getSupabaseAdmin() as never)[prop]
  },
})
