import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !window.location.hash.includes('type=recovery')) {
        navigate('/login', { replace: true })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      } else if (event === 'SIGNED_IN') {
        navigate('/login', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        setInvalid(true)
      }
    })

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
      window.setTimeout(() => navigate('/login', { replace: true }), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">Agency CRM</p>
            <p className="text-xs text-text-muted mt-0.5">Social Media</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
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

            {!done && invalid && (
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-text-primary">Link ongeldig of verlopen</h2>
                <p className="text-xs text-text-muted">Vraag een nieuwe resetlink aan.</p>
                <Link to="/forgot-password" className="inline-block mt-1 text-xs text-primary hover:underline">
                  Nieuwe link aanvragen
                </Link>
              </div>
            )}

            {!done && !invalid && !ready && (
              <div className="text-center py-4 space-y-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Link verifiëren…</p>
              </div>
            )}

            {!done && !invalid && ready && (
              <>
                <CardHeader className="px-0 pt-0 pb-4">
                  <CardTitle className="text-base">Nieuw wachtwoord</CardTitle>
                  <CardDescription>Kies een nieuw wachtwoord van minimaal 8 tekens.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Nieuw wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      placeholder="minimaal 8 tekens"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Bevestig wachtwoord</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="herhaal wachtwoord"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Opslaan…' : 'Wachtwoord opslaan'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>

          <div className="px-6 pb-6">
            <Separator className="mb-4" />
            <div className="text-center">
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Terug naar inloggen
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
