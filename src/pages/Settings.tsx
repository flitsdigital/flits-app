import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, Check, Shield, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { UserProfile, AppPage, UserRole } from '../types'
import clsx from 'clsx'

const PAGE_OPTIONS: { id: AppPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clients', label: 'Klanten' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'content', label: 'Content' },
]

// ─── User modal ───────────────────────────────────────────────────────────────

function UserModal({
  user,
  onClose,
  onSaved,
}: {
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEdit ? 'Account bewerken' : 'Nieuw account'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                E-mailadres <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="naam@bedrijf.nl"
                className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Naam</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Voornaam achternaam"
              className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Wachtwoord{' '}
              {!isEdit ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-text-muted font-normal">(leeg = niet wijzigen)</span>
              )}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Rol</label>
            <div className="flex gap-2">
              {(['admin', 'default'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={clsx(
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

          {role === 'default' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Toegang tot pagina's
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAGE_OPTIONS.map(({ id, label }) => {
                  const on = allowedPages.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePage(id)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                        on
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                      )}
                    >
                      <div className={clsx(
                        'w-4 h-4 rounded flex items-center justify-center border flex-shrink-0',
                        on ? 'bg-green-500 border-green-500' : 'border-zinc-600'
                      )}>
                        {on && <Check size={10} className="text-white" />}
                      </div>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04] text-sm rounded-lg transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Bezig…' : isEdit ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  user,
  onClose,
  onDeleted,
}: {
  user: UserProfile
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    const { error: err } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (err) { setError(err.message); setLoading(false); return }
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-sm p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Account verwijderen</h2>
        <p className="text-xs text-text-muted mb-4">
          Weet je zeker dat je <span className="text-text-secondary">{user.email}</span> wil verwijderen?
        </p>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-border-subtle text-text-secondary hover:text-text-primary text-sm rounded-lg transition-colors">
            Annuleren
          </button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? 'Bezig…' : 'Verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────

export function Settings() {
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
    if (error) { setPwError(error.message) } else { setPwSuccess(true); setNewPassword('') }
    setPwLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold text-text-primary mb-6">Instellingen</h1>

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
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Nieuw wachtwoord"
                  className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={pwLoading || !newPassword}
                className="px-4 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {pwLoading ? 'Bezig…' : 'Opslaan'}
              </button>
            </div>
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-400">Wachtwoord gewijzigd.</p>}
          </form>

          <button onClick={() => signOut()} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Uitloggen
          </button>
        </div>
      </section>

      {/* Gebruikersbeheer */}
      <section className="bg-surface-1 border border-border-subtle rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Gebruikers</h2>
            <p className="text-xs text-text-muted mt-0.5">Beheer accounts en toegang</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={13} />
            Nieuw account
          </button>
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
              <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-surface-0 border border-border-subtle flex items-center justify-center flex-shrink-0">
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
                  <button
                    onClick={() => setEditUser(u)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/[0.06] rounded-md transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  {u.id !== profile?.id && (
                    <button
                      onClick={() => setDeleteUser(u)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {(showCreate || editUser) && (
        <UserModal
          user={editUser}
          onClose={() => { setShowCreate(false); setEditUser(undefined) }}
          onSaved={() => { loadUsers(); if (editUser?.id === profile?.id) refreshProfile() }}
        />
      )}
      {deleteUser && (
        <DeleteConfirm
          user={deleteUser}
          onClose={() => setDeleteUser(undefined)}
          onDeleted={loadUsers}
        />
      )}
    </div>
  )
}
