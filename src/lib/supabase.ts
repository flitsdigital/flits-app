import { createClient } from '@supabase/supabase-js'
import type { LockFunc } from '@supabase/auth-js'

// No-op lock: skip all auth serialisation locking.
//
// Why: Supabase's default navigatorLock (Web Locks API) hangs forever when a
// crashed/sleeping tab still owns the lock. processLock fixes that but
// introduces a single-process queue — any stuck token refresh (e.g. network
// blip) holds the lock for its full timeout, causing every subsequent auth
// call to fail with "Lock acquisition timed out".
//
// In a single-tab React app we control the auth lifecycle ourselves; the
// race-condition that locking guards against (two concurrent refreshes)
// cannot realistically occur. Removing the lock altogether avoids both
// failure modes with no meaningful downside.
const noopLock: LockFunc = (_name, _acquireTimeout, fn) => fn()

/**
 * Wraps any thenable (including Supabase query builders) with a timeout.
 * If it doesn't resolve within `ms` milliseconds, rejects with a user-friendly
 * Dutch error message — preventing infinite "Bezig…" states on hanging connections.
 *
 * Default is 8 s (was 12 s) so the user gets feedback faster and can retry
 * sooner, rather than waiting 12 s before seeing an error.
 */
export function withTimeout<T>(thenable: PromiseLike<T>, ms = 8_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Verbinding time-out. Controleer je netwerk en probeer opnieuw.')),
      ms,
    )
    Promise.resolve(thenable).then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { lock: noopLock } },
)

// ⚠️  SECURITY NOTE: VITE_SUPABASE_SERVICE_ROLE_KEY is bundled into the client
// and is therefore visible to anyone who inspects the network traffic or JS bundle.
// This bypasses Row Level Security. Move admin operations to a Supabase Edge
// Function or server-side API so the service role key never leaves the server.
let _admin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!_admin) {
    const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string
    if (!key) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is niet ingesteld in .env')
    _admin = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      key,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          storageKey: 'sb-admin',
          // Use a no-op lock: the admin client never refreshes tokens,
          // so sharing processLock with the regular client caused both
          // to deadlock — each timing out waiting for the other's lock.
          lock: noopLock,
        },
      },
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
