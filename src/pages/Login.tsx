import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export function Login() {
  const { signIn, session } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email, password)
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      navigate('/', { replace: true })
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
          <h1 className="text-base font-semibold text-text-primary mb-1">Inloggen</h1>
          <p className="text-xs text-text-muted mb-5">Voer je gegevens in om door te gaan</p>

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
                className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-text-secondary">
                  Wachtwoord
                </label>
                <Link to="/forgot-password" className="text-xs text-text-muted hover:text-accent-blue transition-colors">
                  Vergeten?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
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
              {loading ? 'Bezig…' : 'Inloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
