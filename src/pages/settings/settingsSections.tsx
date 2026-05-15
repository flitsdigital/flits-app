import { useEffect, useState } from 'react'
import { User, Shield, Plus, Pencil, Trash2, Camera, X, Eye, EyeOff, Check } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/errors'
import { useAuthStore } from '../../store/useAuthStore'
import { useAppearanceStore, ACCENT_OPTIONS, type AccentColor } from '../../store/useAppearanceStore'
import type { UserProfile } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PAGE_OPTIONS } from './settingsConstants'
import { SectionWrap, SettingRow } from './settingsPrimitives'
import { UserModal, DeleteConfirm } from './settingsUserDialogs'

export function ProfielSection() {
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
    const { error } = await supabase.from('profiles').update({ name: name || null, updated_at: new Date().toISOString() } as never).eq('id', profile!.id)
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
        cacheControl: '3600',
      })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() } as never).eq('id', profile.id)
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
    await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() } as never).eq('id', profile.id)
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

export function UiterlijkSection() {
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
export function loadNotifPrefs(): NotifPrefs {
  try { return JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) ?? '{}') } catch { return {} as NotifPrefs }
}

export function MeldingenSection() {
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

export function WerkruimteSection() {
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

export function GebruikersSection() {
  const { profile, refreshProfile } = useAuthStore()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [editUser, setEditUser] = useState<UserProfile | undefined>()
  const [deleteUser, setDeleteUser] = useState<UserProfile | undefined>()
  const [showCreate, setShowCreate] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
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
