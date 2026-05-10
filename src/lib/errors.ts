/**
 * Robust error message extractor.
 *
 * Supabase errors are plain objects (PostgrestError, AuthError, ...) with a
 * `message` field — they are NOT instances of `Error`, so `String(err)` on
 * them yields the useless "[object Object]". This helper covers all the
 * shapes we run into in this codebase.
 */
export function errorMessage(err: unknown): string {
  if (!err) return 'Onbekende fout'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message

  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    const candidates: Array<unknown> = [
      e.message,
      e.error_description,
      e.error,
      e.details,
      e.hint,
      e.statusText,
    ]
    for (const c of candidates) {
      if (typeof c === 'string' && c.length > 0) return c
    }
    try {
      const json = JSON.stringify(err)
      if (json && json !== '{}') return json
    } catch {
      // ignore — fall through
    }
  }

  return String(err)
}
