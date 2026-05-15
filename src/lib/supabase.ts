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

// Admin operations (user management, external post preview) run via Supabase Edge
// Functions with the service role key — never expose it in VITE_* env vars.
