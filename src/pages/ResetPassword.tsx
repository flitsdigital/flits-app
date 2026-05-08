import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inputCls =
  'w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors'

export function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)       // token verwerkt door Supabase
  const [invalid, setInvalid] = useState(false)   // link verlopen / ongeldig
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Als er al een actieve sessie is zonder recovery-token, stuur terug naar login
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !window.location.hash.includes('type=recovery')) {
        navigate('/login', { replace: true })
      }
    })

    // Supabase verwerkt de tokens uit de URL hash automatisch en stuurt
    // een PASSWORD_RECOVERY event als het een geldige reset-link is.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      } else if (event === 'SIGNED_IN') {
        // Ingelogd zonder recovery-flow → terug naar login
        navigate('/login', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        setInvalid(true)
      }
    })

    // Fallback: als er na 4 seconden nog geen event is, is de link ongeldig
    const timer = window.setTimeout(() => {
      setReady((r) => {
        if (!r) setInvalid(true)
        return r
      })
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten.')
      return
    }
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setDone(true)
      // Automatisch doorsturen naar login na 2 seconden
      window.setTimeout(() => navigate('/login', { replace: true }), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">Agency CRM</p>
            <p className="text-xs text-text-muted mt-0.5">Social Media</p>
          </div>
        </div>

        <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">

          {/* ── Succes ── */}
          {done && (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-text-primary">Wachtwoord gewijzigd</h2>
              <p className="text-xs text-text-muted">Je wordt doorgestuurd naar de inlogpagina…</p>
            </div>
          )}

          {/* ── Ongeldig / verlopen ── */}
          {!done && invalid && (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-text-primary">Link ongeldig of verlopen</h2>
              <p className="text-xs text-text-muted">Vraag een nieuwe resetlink aan.</p>
              <Link
                to="/forgot-password"
                className="inline-block mt-1 text-xs text-accent-blue hover:underline"
              >
                Nieuwe link aanvragen
              </Link>
            </div>
          )}

          {/* ── Laden (wacht op Supabase token) ── */}
          {!done && !invalid && !ready && (
            <div className="text-center py-4 space-y-3">
              <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-text-muted">Link verifiëren…</p>
            </div>
          )}

          {/* ── Formulier ── */}
          {!done && !invalid && ready && (
            <>
              <h1 className="text-base font-semibold text-text-primary mb-1">Nieuw wachtwoord</h1>
              <p className="text-xs text-text-muted mb-5">Kies een nieuw wachtwoord van minimaal 8 tekens.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Nieuw wachtwoord
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="minimaal 8 tekens"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Bevestig wachtwoord
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="herhaal wachtwoord"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Opslaan…' : 'Wachtwoord opslaan'}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-border-subtle text-center">
            <Link to="/login" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              ← Terug naar inloggen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
