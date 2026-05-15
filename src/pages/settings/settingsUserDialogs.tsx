import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Camera, Plus, Shield, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { errorMessage } from '../../lib/errors'
import type { UserProfile, AppPage, UserRole, FeatureFlag } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PAGE_OPTIONS } from './settingsConstants'

export function UserModal({ open, user, onClose, onSaved }: {
  open: boolean; user?: UserProfile; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!user
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [role, setRole] = useState<UserRole>(user?.role ?? 'default')
  const [allowedPages, setAllowedPages] = useState<AppPage[]>(user?.allowed_pages ?? ['content'])
  const [allowedFeatures, setAllowedFeatures] = useState<FeatureFlag[]>(user?.allowed_features ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEmail(user?.email ?? '')
      setName(user?.name ?? '')
      setPassword('')
      setRole(user?.role ?? 'default')
      setAllowedPages(user?.allowed_pages ?? ['content'])
      setAllowedFeatures(user?.allowed_features ?? [])
      setError(null)
    }
  }, [open, user])

  function togglePage(page: AppPage) {
    setAllowedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        const { error: profileErr } = await supabaseAdmin.from('profiles').update({
          name: name || null, role,
          allowed_pages: role === 'admin' ? [] : allowedPages,
          allowed_features: role === 'admin' ? [] : allowedFeatures,
          updated_at: new Date().toISOString(),
        } as never).eq('id', user!.id)
        if (profileErr) throw profileErr
        if (password) {
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(user!.id, { password })
          if (pwErr) throw pwErr
        }
      } else {
        const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { name: name || undefined },
        })
        if (createErr) throw createErr
        const { error: profileErr } = await supabaseAdmin.from('profiles').update({
          name: name || null, role,
          allowed_pages: role === 'admin' ? [] : allowedPages,
          allowed_features: role === 'admin' ? [] : allowedFeatures,
        } as never).eq('id', data.user.id)
        if (profileErr) throw profileErr
      }
      onSaved(); onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Account bewerken' : 'Nieuw account'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? 'Wijzig gegevens van dit account.' : 'Maak een nieuw account aan.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mailadres <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="naam@bedrijf.nl" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Naam</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Voornaam achternaam" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">
              Wachtwoord{' '}
              {!isEdit ? <span className="text-destructive">*</span>
                : <span className="text-muted-foreground font-normal">(leeg = niet wijzigen)</span>}
            </Label>
            <div className="relative">
              <Input id="password" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} required={!isEdit} placeholder="••••••••" className="pr-9" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <div className="flex gap-2">
              {(['admin', 'default'] as UserRole[]).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)} className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm transition-colors',
                  role === r
                    ? r === 'admin'
                      ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                      : 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                )}>
                  {r === 'admin' ? <Shield size={13} /> : <UserIcon size={13} />}
                  {r === 'admin' ? 'Admin' : 'Standaard'}
                </button>
              ))}
            </div>
          </div>

          {role === 'default' && (
            <div className="space-y-2">
              <Label>Toegang tot pagina's</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAGE_OPTIONS.map(({ id, label }) => (
                  <div key={id} className="flex items-center justify-between gap-2 bg-surface-2 border border-border-subtle rounded-lg px-3 py-2">
                    <Label htmlFor={`page-${id}`} className="font-normal cursor-pointer text-xs text-text-secondary">{label}</Label>
                    <Switch id={`page-${id}`} checked={allowedPages.includes(id)} onCheckedChange={() => togglePage(id)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {role === 'default' && (
            <div className="space-y-2">
              <Label>Extra toegang</Label>
              <div className="flex items-center justify-between gap-2 bg-surface-2 border border-border-subtle rounded-lg px-3 py-2">
                <div>
                  <Label htmlFor="feature-financials" className="font-normal cursor-pointer text-xs text-text-secondary">Projectwaarden &amp; facturatie</Label>
                  <p className="text-[10px] text-text-disabled mt-0.5">Projectbudget, gefactureerde bedragen, klantomzet, MRR op dashboard</p>
                </div>
                <Switch
                  id="feature-financials"
                  checked={allowedFeatures.includes('financials')}
                  onCheckedChange={() => {
                    setAllowedFeatures(prev =>
                      prev.includes('financials') ? prev.filter(f => f !== 'financials') : [...prev, 'financials']
                    )
                  }}
                />
              </div>
            </div>
          )}

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuleren</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteConfirm({ open, user, onClose, onDeleted }: {
  open: boolean; user?: UserProfile; onClose: () => void; onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleDelete() {
    if (!user) return
    setLoading(true)
    const { error: err } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (err) { setError(err.message); setLoading(false); return }
    onDeleted(); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Account verwijderen</DialogTitle>
          <DialogDescription className="sr-only">Bevestig verwijdering.</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Weet je zeker dat je <span className="text-foreground font-medium">{user?.email}</span> wil verwijderen? Dit kan niet ongedaan worden gemaakt.
        </p>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuleren</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading} className="flex-1">
            {loading ? 'Bezig…' : 'Verwijderen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
