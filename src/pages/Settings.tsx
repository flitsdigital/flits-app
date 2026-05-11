import { useEffect, useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { Navigate } from 'react-router-dom'
import {
  User, Shield, Plus, Pencil, Trash2,
  Palette, Bell, Building2, Users,
  Check, Eye, EyeOff, Camera, X,
} from 'lucide-react'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { useAuthStore } from '../store/useAuthStore'
import { useAppearanceStore, ACCENT_OPTIONS, type AccentColor } from '../store/useAppearanceStore'
import { PageHeader } from '../components/PageHeader'
import type { UserProfile, AppPage, UserRole } from '../types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const PAGE_OPTIONS: { id: AppPage; label: string }[] = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'clients',      label: 'Klanten' },
  { id: 'timeline',     label: 'Timeline' },
  { id: 'content',      label: 'Content' },
  { id: 'reiskosten',   label: 'Reiskosten' },
  { id: 'projects',     label: 'Projecten' },
  { id: 'leads',        label: 'Leads' },
  { id: 'time_tracking', label: 'Uren' },
]

// ─── Nav sections ─────────────────────────────────────────────────────────────

type Section = 'profiel' | 'uiterlijk' | 'meldingen' | 'werkruimte' | 'gebruikers'

interface NavItem {
  id: Section
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profiel',    label: 'Profiel',      icon: User },
  { id: 'uiterlijk',  label: 'Uiterlijk',    icon: Palette },
  { id: 'meldingen',  label: 'Meldingen',    icon: Bell },
  { id: 'werkruimte', label: 'Werkruimte',   icon: Building2, adminOnly: true },
  { id: 'gebruikers', label: 'Gebruikers',   icon: Users,     adminOnly: true },
]

// ─── User modal ───────────────────────────────────────────────────────────────

function UserModal({ open, user, onClose, onSaved }: {
  open: boolean; user?: UserProfile; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!user
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [role, setRole] = useState<UserRole>(user?.role ?? 'default')
  const [allowedPages, setAllowedPages] = useState<AppPage[]>(user?.allowed_pages ?? ['content'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEmail(user?.email ?? '')
      setName(user?.name ?? '')
      setPassword('')
      setRole(user?.role ?? 'default')
      setAllowedPages(user?.allowed_pages ?? ['content'])
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
                  {r === 'admin' ? <Shield size={13} /> : <User size={13} />}
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

function DeleteConfirm({ open, user, onClose, onDeleted }: {
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

// ─── Section components ────────────────────────────────────────────────────────

function SectionWrap({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border-subtle last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Profiel section ──────────────────────────────────────────────────────────

function ProfielSection() {
  const { profile, refreshProfile } = useAuthStore()
  const [name, setName] = useState(profile?.name ?? '')
  const [nameLoading, setNameLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNameLoading(true)
    const { error } = await supabaseAdmin.from('profiles').update({ name: name || null } as never).eq('id', profile!.id)
    if (error) toast.error('Mislukt', { description: error.message })
    else { toast.success('Naam opgeslagen'); await refreshProfile() }
    setNameLoading(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast.error('Mislukt', { description: error.message })
    else { toast.success('Wachtwoord gewijzigd'); setNewPassword('') }
    setPwLoading(false)
  }

  /** Resize + compress an image file to max 256×256 px as WebP using Canvas. */
  function optimizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const MAX = 256
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob mislukt')),
          'image/webp',
          0.85,
        )
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Afbeelding laden mislukt')) }
      img.src = objectUrl
    })
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Bestand te groot', { description: 'Maximaal 20 MB' }); return }
    setAvatarLoading(true)
    try {
      const optimized = await optimizeImage(file)
      const path = `${profile.id}/avatar.webp`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, optimized, {
        upsert: true,
        contentType: 'image/webp',
      })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: updateErr } = await supabaseAdmin.from('profiles').update({ avatar_url: url } as never).eq('id', profile.id)
      if (updateErr) throw updateErr
      toast.success('Avatar opgeslagen')
      await refreshProfile()
    } catch (err: unknown) {
      toast.error('Upload mislukt', { description: String(err) })
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  async function removeAvatar() {
    if (!profile) return
    setAvatarLoading(true)
    await supabaseAdmin.from('profiles').update({ avatar_url: null } as never).eq('id', profile.id)
    toast.success('Avatar verwijderd')
    await refreshProfile()
    setAvatarLoading(false)
  }

  const initials = (profile?.name ?? profile?.email ?? 'U')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <SectionWrap title="Profiel" description="Je persoonlijke gegevens en accountinstellingen.">
      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-border-subtle">
        <div className="relative shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-accent-blue/20 flex items-center justify-center">
              <span className="text-xl font-bold text-accent-blue">{initials}</span>
            </div>
          )}
          {avatarLoading && (
            <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{profile?.name ?? profile?.email}</p>
          <p className="text-xs text-text-muted mb-2">{profile?.email}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border-default text-xs text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors">
              <Camera size={12} />
              {profile?.avatar_url ? 'Wijzigen' : 'Foto uploaden'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} className="sr-only" disabled={avatarLoading} />
            </label>
            {profile?.avatar_url && (
              <button onClick={removeAvatar} disabled={avatarLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-subtle text-xs text-text-muted hover:text-destructive hover:border-destructive/40 transition-colors">
                <X size={12} /> Verwijderen
              </button>
            )}
          </div>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border shrink-0 self-start',
          profile?.role === 'admin'
            ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/30'
            : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
        )}>
          {profile?.role === 'admin' ? <><Shield size={10} /> Admin</> : <><User size={10} /> Standaard</>}
        </span>
      </div>

      <div className="bg-surface-1 rounded-xl border border-border-subtle divide-y divide-border-subtle">
        <div className="p-4">
          <form onSubmit={saveName} className="space-y-3">
            <SettingRow label="Weergavenaam" description="Zichtbaar in reacties, notificaties en het dashboard.">
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className="w-44" />
                <Button type="submit" size="sm" disabled={nameLoading || name === (profile?.name ?? '')}>
                  {nameLoading ? 'Bezig…' : 'Opslaan'}
                </Button>
              </div>
            </SettingRow>
          </form>
        </div>

        <div className="p-4">
          <form onSubmit={changePassword} className="space-y-3">
            <SettingRow label="Wachtwoord wijzigen" description="Minimaal 8 tekens.">
              <div className="flex gap-2">
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required minLength={8} placeholder="Nieuw wachtwoord" className="w-44 pr-8" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <Button type="submit" size="sm" disabled={pwLoading || !newPassword}>
                  {pwLoading ? 'Bezig…' : 'Opslaan'}
                </Button>
              </div>
            </SettingRow>
          </form>
        </div>
      </div>
    </SectionWrap>
  )
}

// ─── Uiterlijk section ────────────────────────────────────────────────────────

function UiterlijkSection() {
  const { accent, setAccent } = useAppearanceStore()

  return (
    <SectionWrap title="Uiterlijk" description="Pas de look van de app aan naar jouw voorkeur.">
      <div className="bg-surface-1 rounded-xl border border-border-subtle">
        <div className="p-4">
          <SettingRow label="Accentkleur" description="Knoppen, links en actieve staten gebruiken deze kleur.">
            <div className="flex gap-2 flex-wrap justify-end">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAccent(opt.id as AccentColor)}
                  title={opt.label}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center',
                    accent === opt.id ? 'border-white/60 scale-110' : 'border-transparent hover:border-white/30'
                  )}
                  style={{ backgroundColor: opt.hex }}
                >
                  {accent === opt.id && <Check size={12} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </SettingRow>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_OPTIONS.map((opt) => (
              <span key={opt.id} className={cn(
                'text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-all',
                accent === opt.id ? 'text-white border-white/20' : 'text-text-muted border-border-subtle hover:border-border-default'
              )} style={accent === opt.id ? { backgroundColor: opt.hex + '33', borderColor: opt.hex + '60' } : {}}
                onClick={() => setAccent(opt.id as AccentColor)}>
                {opt.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </SectionWrap>
  )
}

// ─── Meldingen section ────────────────────────────────────────────────────────

const NOTIF_PREFS_KEY = 'notif-prefs'
type NotifPrefs = { mentions: boolean; tasks: boolean }
function loadNotifPrefs(): NotifPrefs {
  try { return JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) ?? '{}') } catch { return {} as NotifPrefs }
}

function MeldingenSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...{ mentions: true, tasks: true }, ...loadNotifPrefs() })

  function toggle(key: keyof NotifPrefs) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] }
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <SectionWrap title="Meldingen" description="Bepaal wanneer je een notificatie ontvangt.">
      <div className="bg-surface-1 rounded-xl border border-border-subtle divide-y divide-border-subtle">
        <div className="p-4">
          <SettingRow label="Vermeldingen" description="Ontvang een melding als iemand je tagt in een opmerking of notitie.">
            <Switch checked={prefs.mentions} onCheckedChange={() => toggle('mentions')} />
          </SettingRow>
        </div>
        <div className="p-4">
          <SettingRow label="Taaktoewijzingen" description="Ontvang een melding als een taak aan je wordt toegewezen.">
            <Switch checked={prefs.tasks} onCheckedChange={() => toggle('tasks')} />
          </SettingRow>
        </div>
      </div>
      <p className="text-xs text-text-muted">Meldingen worden direct bezorgd via de inbox in de sidebar.</p>
    </SectionWrap>
  )
}

// ─── Werkruimte section ───────────────────────────────────────────────────────

function WerkruimteSection() {
  const { workspaceName, setWorkspaceName } = useAppearanceStore()
  const [name, setName] = useState(workspaceName)

  function saveName(e: React.FormEvent) {
    e.preventDefault()
    setWorkspaceName(name.trim() || 'Flits Impact')
    toast.success('Werkruimtenaam opgeslagen')
  }

  return (
    <SectionWrap title="Werkruimte" description="Instellingen die voor de hele werkruimte gelden.">
      <div className="bg-surface-1 rounded-xl border border-border-subtle">
        <div className="p-4">
          <form onSubmit={saveName}>
            <SettingRow label="Naam werkruimte" description="Wordt weergegeven bovenaan de sidebar.">
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Werkruimtenaam" className="w-44" />
                <Button type="submit" size="sm" disabled={name === workspaceName || !name.trim()}>
                  Opslaan
                </Button>
              </div>
            </SettingRow>
          </form>
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Werkruimte-instellingen worden lokaal opgeslagen per browser.
      </p>
    </SectionWrap>
  )
}

// ─── Gebruikers section ───────────────────────────────────────────────────────

function GebruikersSection() {
  const { profile, refreshProfile } = useAuthStore()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [editUser, setEditUser] = useState<UserProfile | undefined>()
  const [deleteUser, setDeleteUser] = useState<UserProfile | undefined>()
  const [showCreate, setShowCreate] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabaseAdmin.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { void loadUsers() }, [])

  return (
    <SectionWrap title="Gebruikers" description="Beheer accounts, rollen en toegangsrechten.">
      <div className="bg-surface-1 rounded-xl border border-border-subtle overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <p className="text-xs text-text-muted">{users.length} account{users.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Nieuw account
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-surface-3 border border-border-subtle flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-text-secondary">
                    {(u.name ?? u.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary truncate">{u.name ?? u.email}</span>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs',
                      u.role === 'admin'
                        ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/30'
                        : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    )}>
                      {u.role === 'admin' ? <><Shield size={9} />Admin</> : <><User size={9} />Standaard</>}
                    </span>
                    {u.id === profile?.id && <span className="text-xs text-text-muted">(jij)</span>}
                  </div>
                  {u.name && <p className="text-xs text-text-muted truncate">{u.email}</p>}
                  {u.role === 'default' && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.allowed_pages.length === 0 ? (
                        <span className="text-xs text-amber-400/80">Geen toegang</span>
                      ) : u.allowed_pages.map((p) => (
                        <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-text-muted border border-border-subtle">
                          {PAGE_OPTIONS.find((o) => o.id === p)?.label ?? p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-text-primary" onClick={() => setEditUser(u)}>
                    <Pencil size={13} />
                  </Button>
                  {u.id !== profile?.id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-destructive" onClick={() => setDeleteUser(u)}>
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UserModal
        open={showCreate || !!editUser}
        user={editUser}
        onClose={() => { setShowCreate(false); setEditUser(undefined) }}
        onSaved={() => { loadUsers(); if (editUser?.id === profile?.id) refreshProfile() }}
      />
      <DeleteConfirm
        open={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(undefined)}
        onDeleted={loadUsers}
      />
    </SectionWrap>
  )
}

// ─── Main Settings page ────────────────────────────────────────────────────────

export function Settings() {
  usePageMeta('Instellingen → Flits Impact')
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const [active, setActive] = useState<Section>('profiel')

  if (!isAdmin && !profile) return <Navigate to="/" replace />

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-full">
      {/* ── Settings sidebar ── */}
      <aside className="w-52 shrink-0 border-r border-border-subtle py-4 px-2 space-y-0.5">
        <p className="text-xs font-semibold text-text-muted px-2 mb-2 uppercase tracking-wider">Instellingen</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-[5px] rounded text-sm transition-colors text-left',
                isActive
                  ? 'bg-white/[0.08] text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              )}
            >
              <Icon size={14} strokeWidth={1.8} className="shrink-0 opacity-70" />
              {item.label}
            </button>
          )
        })}
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto">
        <PageHeader
          title={navItems.find((n) => n.id === active)?.label ?? 'Instellingen'}
        />
        <div className="px-6 py-6 max-w-2xl">
          {active === 'profiel'    && <ProfielSection />}
          {active === 'uiterlijk'  && <UiterlijkSection />}
          {active === 'meldingen'  && <MeldingenSection />}
          {active === 'werkruimte' && isAdmin && <WerkruimteSection />}
          {active === 'gebruikers' && isAdmin && <GebruikersSection />}
        </div>
      </main>
    </div>
  )
}
