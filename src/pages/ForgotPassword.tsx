import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inputCls =
  'w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
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
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.7a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-text-primary">E-mail verstuurd</h2>
              <p className="text-xs text-text-muted">
                Als <span className="text-text-secondary font-medium">{email}</span> een account heeft, ontvang je een link om je wachtwoord opnieuw in te stellen.
              </p>
              <p className="text-xs text-text-muted">Controleer ook je spam-map.</p>
            </div>
          ) : (
            <>
              <h1 className="text-base font-semibold text-text-primary mb-1">Wachtwoord vergeten</h1>
              <p className="text-xs text-text-muted mb-5">
                Vul je e-mailadres in en we sturen je een link om je wachtwoord opnieuw in te stellen.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="naam@bedrijf.nl"
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
                  {loading ? 'Versturen…' : 'Resetlink versturen'}
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
