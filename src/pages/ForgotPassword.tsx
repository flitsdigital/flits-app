import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
          {sent ? (
            <CardContent className="pt-6">
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
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Wachtwoord vergeten</CardTitle>
                <CardDescription>
                  Vul je e-mailadres in en we sturen je een link om je wachtwoord opnieuw in te stellen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      placeholder="naam@bedrijf.nl"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Versturen…' : 'Resetlink versturen'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

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
