import { useEffect, useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { Navigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Shield, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { PageHeader } from '../components/PageHeader'
import type { UserProfile, AppPage, UserRole } from '../types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const PAGE_OPTIONS: { id: AppPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clients', label: 'Klanten' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'content', label: 'Content' },
  { id: 'reiskosten', label: 'Reiskosten' },
  { id: 'projects', label: 'Projecten' },
  { id: 'leads', label: 'Leads' },
]

// ─── User modal ───────────────────────────────────────────────────────────────

function UserModal({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean
  user?: UserProfile
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!user
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [password, setPassword] = useState('')
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
        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update({
            name: name || null,
            role,
            allowed_pages: role === 'admin' ? [] : allowedPages,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', user!.id)
        if (profileErr) throw profileErr

        if (password) {
          const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(user!.id, { password })
          if (pwErr) throw pwErr
        }
      } else {
        const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: name || undefined },
        })
        if (createErr) throw createErr

        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update({
            name: name || null,
            role,
            allowed_pages: role === 'admin' ? [] : allowedPages,
          } as never)
          .eq('id', data.user.id)
        if (profileErr) throw profileErr
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Account bewerken' : 'Nieuw account'}</DialogTitle>
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
              {!isEdit
                ? <span className="text-destructive">*</span>
                : <span className="text-muted-foreground font-normal">(leeg = niet wijzigen)</span>
              }
            </Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit} placeholder="••••••••" />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label>Rol</Label>
            <div className="flex gap-2">
              {(['admin', 'default'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm transition-colors',
                    role === r
                      ? r === 'admin'
                        ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                        : 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  )}
                >
                  {r === 'admin' ? <Shield size={13} /> : <User size={13} />}
                  {r === 'admin' ? 'Admin' : 'Standaard'}
                </button>
              ))}
            </div>
          </div>

          {/* Page access */}
          {role === 'default' && (
            <div className="space-y-2">
              <Label>Toegang tot pagina's</Label>
              <div className="grid grid-cols-2 gap-3">
                {PAGE_OPTIONS.map(({ id, label }) => (
                  <div key={id} className="flex items-center justify-between gap-2 bg-muted/30 border border-border rounded-md px-3 py-2">
                    <Label htmlFor={`page-${id}`} className="font-normal cursor-pointer text-sm">{label}</Label>
                    <Switch
                      id={`page-${id}`}
                      checked={allowedPages.includes(id)}
                      onCheckedChange={() => togglePage(id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  open,
  user,
  onClose,
  onDeleted,
}: {
  open: boolean
  user?: UserProfile
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!user) return
    setLoading(true)
    const { error: err } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (err) { setError(err.message); setLoading(false); return }
    onDeleted()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Account verwijderen</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Weet je zeker dat je <span className="text-foreground">{user?.email}</span> wil verwijderen?
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
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

// ─── Settings page ────────────────────────────────────────────────────────────

export function Settings() {
  usePageMeta('Instellingen → Flits Impact', 'Beheer gebruikers, rollen en toegangsrechten.')
  const { profile, signOut, refreshProfile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [editUser, setEditUser] = useState<UserProfile | undefined>()
  const [deleteUser, setDeleteUser] = useState<UserProfile | undefined>()
  const [showCreate, setShowCreate] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  if (!isAdmin) return <Navigate to="/" replace />

  async function loadUsers() {
    setUsersLoading(true)
    const { data } = await supabaseAdmin.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setUsersLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); toast.error('Mislukt', { description: error.message }) }
    else { setPwSuccess(true); setNewPassword(''); toast.success('Wachtwoord gewijzigd') }
    setPwLoading(false)
  }

  return (
    <div>
      <PageHeader title="Instellingen" />
      <div className="px-6 py-5 max-w-2xl mx-auto">

        {/* Mijn account */}
        <section className="bg-surface-1 border border-border-subtle rounded-xl mb-4">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">Mijn account</h2>
            <p className="text-xs text-text-muted mt-0.5">{profile?.email}</p>
          </div>
          <div className="p-5 space-y-4">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <p className="text-xs font-medium text-text-secondary">Wachtwoord wijzigen</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Nieuw wachtwoord"
                  />
                </div>
                <Button type="submit" disabled={pwLoading || !newPassword}>
                  {pwLoading ? 'Bezig…' : 'Opslaan'}
                </Button>
              </div>
              {pwError && <p className="text-xs text-destructive">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-400">Wachtwoord gewijzigd.</p>}
            </form>

            <Button variant="destructive" size="sm" onClick={() => signOut()} className="text-xs text-destructive hover:text-destructive">
              Uitloggen
            </Button>
          </div>
        </section>

        <Separator className="mb-4 bg-border-subtle" />

        {/* Gebruikersbeheer */}
        <section className="bg-surface-1 border border-border-subtle rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Gebruikers</h2>
              <p className="text-xs text-text-muted mt-0.5">Beheer accounts en toegang</p>
            </div>
            <Button variant="default" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={13} />
              Nieuw account
            </Button>
          </div>

          <div className="divide-y divide-border-subtle">
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-muted text-center">Geen gebruikers.</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                  <div className="w-6 h-6 rounded bg-surface-0 border border-border-subtle flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-text-secondary">
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-text-primary truncate">{u.name ?? u.email}</span>
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30 text-xs">
                          <Shield size={10} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs">
                          <User size={10} /> Standaard
                        </span>
                      )}
                      {u.id === profile?.id && <span className="text-xs text-text-muted">(jij)</span>}
                    </div>
                    {u.name && <p className="text-xs text-text-muted truncate">{u.email}</p>}
                    {u.role === 'default' && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {u.allowed_pages.length === 0 ? (
                          <span className="text-xs text-amber-400/80">Geen toegang</span>
                        ) : (
                          u.allowed_pages.map((p) => (
                            <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted border border-border-subtle">
                              {PAGE_OPTIONS.find((o) => o.id === p)?.label ?? p}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
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
              ))
            )}
          </div>
        </section>

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
      </div>
    </div>
  )
}
