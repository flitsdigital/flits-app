import { createClient } from '@supabase/supabase-js'
import { processLock } from '@supabase/auth-js'

/**
 * Wraps any thenable (including Supabase query builders) with a timeout.
 * If it doesn't resolve within `ms` milliseconds, rejects with a user-friendly
 * Dutch error message — preventing infinite "Bezig…" states on hanging connections.
 */
export function withTimeout<T>(thenable: PromiseLike<T>, ms = 12_000): Promise<T> {
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

/**
 * Single-tab `processLock` instead of the default `navigatorLock`.
 *
 * Supabase v2 normally coordinates auth refresh between tabs through the
 * Web Locks API (`navigator.locks`). When a tab in the same browser profile
 * crashes / freezes / sleeps while holding that lock, EVERY new tab on the
 * same origin hangs forever on `auth.getSession()` — even after clearing
 * site data, because the dead tab still owns the lock until the whole Chrome
 * profile is restarted. Incognito has its own lock namespace, which is why
 * the bug never reproduces there.
 *
 * `processLock` only synchronises within the current page, so we trade
 * "perfect cross-tab refresh coordination" for "the app never hangs".
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      lock: processLock,
      // Hard cap how long the auth client may wait on its internal lock — if
      // anything stalls, the app surfaces a normal error instead of an
      // infinite spinner.
      lockAcquireTimeout: 10_000,
    },
  },
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
          lock: processLock,
          lockAcquireTimeout: 10_000,
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
