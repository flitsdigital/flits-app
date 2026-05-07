import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Image, Video, Film, Square, Layers, Upload, Loader2, ExternalLink, GripVertical, Share2, Check } from 'lucide-react'
import clsx from 'clsx'
import type { Post, PostType, PostStatus, Client } from '../types'
import { supabase } from '../lib/supabase'

type FormData = Omit<Post, 'id' | 'createdAt' | 'updatedAt'>

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType }[] = [
  { value: 'foto', label: 'Foto', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'reel', label: 'Reel', icon: Film },
  { value: 'story', label: 'Story', icon: Square },
  { value: 'carousel', label: 'Carousel', icon: Layers },
]

const POST_STATUSES: { value: PostStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'Te doen', color: 'border-zinc-600 text-zinc-400 bg-zinc-800/50' },
  { value: 'planned', label: 'Gepland', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  { value: 'posted', label: 'Gepost', color: 'border-green-500/40 text-green-400 bg-green-500/10' },
]

const inputCls = 'w-full bg-surface-3 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-colors'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => void | Promise<void>
  initial?: Partial<Post>
  clientId: string
  clients?: Client[]
  lockClient?: boolean
  sharePostId?: string
  title?: string
}

export function PostForm({
  open,
  onClose,
  onSave,
  initial,
  clientId,
  clients = [],
  lockClient = false,
  sharePostId,
  title = 'Post toevoegen',
}: Props) {
  const baseDate = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormData>({
    clientId,
    type: 'foto',
    status: 'todo',
    caption: '',
    mediaUrl: '',
    mediaUrls: [],
    date: baseDate,
    ...initial,
  })
  const [uploading, setUploading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedState, setSavedState] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const captionRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (open) {
      const nextForm: FormData = {
        clientId,
        type: 'foto',
        status: 'todo',
        caption: '',
        mediaUrl: '',
        mediaUrls: [],
        date: baseDate,
        ...initial,
      }
      if (!nextForm.mediaUrls || nextForm.mediaUrls.length === 0) {
        nextForm.mediaUrls = nextForm.mediaUrl ? [nextForm.mediaUrl] : []
      }
      if (!nextForm.mediaUrl && nextForm.mediaUrls.length > 0) {
        nextForm.mediaUrl = nextForm.mediaUrls[0]
      }
      setForm(nextForm)
      setUploadError(null)
      setUploading(false)
      setSubmitLoading(false)
      setDragIndex(null)
      setCopied(false)
      setSavedState(false)
      setInitialSnapshot(JSON.stringify(normalizedForm(nextForm)))
    }
  }, [open, initial, clientId, baseDate])

  const isDirty = useMemo(
    () => JSON.stringify(normalizedForm(form)) !== initialSnapshot,
    [form, initialSnapshot]
  )

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function normalizedForm(value: FormData) {
    const mediaUrls = value.mediaUrls ?? (value.mediaUrl ? [value.mediaUrl] : [])
    return {
      ...value,
      mediaUrls,
      mediaUrl: mediaUrls[0] ?? undefined,
    }
  }

  async function uploadImage(file: File) {
    const bucket = import.meta.env.VITE_SUPABASE_POST_MEDIA_BUCKET || 'post-media'
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${form.clientId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const invalid = files.find((file) => !file.type.startsWith('image/'))
    if (invalid) {
      setUploadError('Kies alleen afbeeldingen (jpg, png, webp, ...).')
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadImage(file)))
      setForm((prev) => {
        const existing = prev.mediaUrls ?? (prev.mediaUrl ? [prev.mediaUrl] : [])
        const mediaUrls = [...existing, ...uploadedUrls]
        return {
          ...prev,
          mediaUrls,
          mediaUrl: mediaUrls[0],
        }
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Uploaden is mislukt.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeMediaAt(index: number) {
    setForm((prev) => {
      const current = prev.mediaUrls ?? (prev.mediaUrl ? [prev.mediaUrl] : [])
      const mediaUrls = current.filter((_, i) => i !== index)
      return {
        ...prev,
        mediaUrls,
        mediaUrl: mediaUrls[0],
      }
    })
  }

  function moveMedia(from: number, to: number) {
    setForm((prev) => {
      const current = [...(prev.mediaUrls ?? (prev.mediaUrl ? [prev.mediaUrl] : []))]
      if (from < 0 || to < 0 || from >= current.length || to >= current.length || from === to) return prev
      const [moved] = current.splice(from, 1)
      current.splice(to, 0, moved)
      return {
        ...prev,
        mediaUrls: current,
        mediaUrl: current[0],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const mediaUrls = form.mediaUrls ?? (form.mediaUrl ? [form.mediaUrl] : [])
    if (form.type === 'carousel' && mediaUrls.length < 2) {
      setUploadError('Voor een carousel heb je minimaal 2 afbeeldingen nodig.')
      return
    }
    setUploadError(null)
    setSubmitLoading(true)
    try {
      const payload: FormData = {
        ...form,
        mediaUrls,
        mediaUrl: mediaUrls[0],
      }
      await onSave(payload)
      setSavedState(true)
      setInitialSnapshot(JSON.stringify(normalizedForm(payload)))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Opslaan is mislukt.')
    } finally {
      setSubmitLoading(false)
    }
  }

  useEffect(() => {
    if (isDirty && savedState) {
      setSavedState(false)
    }
  }, [isDirty, savedState])

  async function copyPreviewLink() {
    if (!sharePostId) return
    const link = `${window.location.origin}/preview/${sharePostId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Kopieer deze preview link:', link)
    }
  }

  function toUnicodeBold(input: string): string {
    return Array.from(input).map((char) => {
      const code = char.codePointAt(0)
      if (!code) return char

      // Mathematical Sans-Serif Bold
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65)) // A-Z
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97)) // a-z
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48)) // 0-9
      return char
    }).join('')
  }

  function applyBoldToSelection() {
    const textarea = captionRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const hasSelection = end > start
    const source = form.caption || ''

    const selected = hasSelection ? source.slice(start, end) : source
    if (!selected) return

    const transformed = toUnicodeBold(selected)
    const nextCaption = hasSelection
      ? `${source.slice(0, start)}${transformed}${source.slice(end)}`
      : transformed

    set('caption', nextCaption)

    window.requestAnimationFrame(() => {
      textarea.focus()
      if (hasSelection) {
        textarea.setSelectionRange(start, start + transformed.length)
      } else {
        textarea.setSelectionRange(0, transformed.length)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] bg-surface-2 rounded-xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <div className="flex items-center gap-1.5">
            {sharePostId && (
              <button
                type="button"
                onClick={copyPreviewLink}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors"
              >
                {copied ? <Check size={13} /> : <Share2 size={13} />}
                {copied ? 'Gekopieerd' : 'Share'}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                {/* Klant */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Klant</label>
                  {lockClient ? (
                    <div className={clsx(inputCls, 'flex items-center bg-surface-3/70')}>
                      {clients.find((c) => c.id === form.clientId)?.companyName ?? 'Onbekende klant'}
                    </div>
                  ) : (
                    <select
                      className={inputCls}
                      value={form.clientId}
                      onChange={(e) => set('clientId', e.target.value)}
                    >
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.companyName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Caption */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-medium text-text-secondary">Caption / tekst</label>
                    <button
                      type="button"
                      onClick={applyBoldToSelection}
                      className="px-2 py-1 text-xs rounded-md border border-border-subtle bg-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors"
                      title="Maak selectie unicode bold"
                    >
                      𝗕 Bold
                    </button>
                  </div>
                  <textarea
                    ref={captionRef}
                    className={clsx(inputCls, 'resize-y min-h-36')}
                    rows={6}
                    placeholder="Schrijf hier de caption…"
                    value={form.caption}
                    onChange={(e) => set('caption', e.target.value)}
                  />
                </div>

                {/* Media upload */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Foto uploaden</label>
                  <div className="space-y-2">
                    <label className={clsx(
                      'w-full flex items-center justify-center gap-2 bg-surface-3 border border-border-subtle rounded-lg px-3 py-2.5 text-sm transition-colors',
                      uploading ? 'text-text-muted' : 'text-text-secondary hover:text-text-primary hover:border-border-default cursor-pointer'
                    )}>
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploading ? 'Uploaden...' : (form.type === 'carousel' ? 'Kies meerdere foto\'s' : 'Kies foto')}
                      <input type="file" accept="image/*" multiple={form.type === 'carousel'} className="hidden" onChange={handleFileChange} disabled={uploading} />
                    </label>

                    {uploadError && (
                      <p className="text-xs text-red-400">{uploadError}</p>
                    )}

                    {(form.mediaUrls?.length ?? 0) > 0 && (
                      <div className="rounded-lg border border-border-subtle bg-surface-3 p-2.5">
                        {form.type === 'carousel' ? (
                          <>
                            <p className="text-xs text-text-muted mb-2">Sleep om de volgorde te bepalen.</p>
                            <div className="space-y-2">
                              {form.mediaUrls?.map((url, index) => (
                                <div
                                  key={`${url}-${index}`}
                                  draggable
                                  onDragStart={() => setDragIndex(index)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => {
                                    if (dragIndex === null) return
                                    moveMedia(dragIndex, index)
                                    setDragIndex(null)
                                  }}
                                  onDragEnd={() => setDragIndex(null)}
                                  className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-2 p-2"
                                >
                                  <GripVertical size={14} className="text-text-muted shrink-0 cursor-grab" />
                                  <img src={url} alt={`Carousel ${index + 1}`} className="w-14 h-14 object-cover rounded-md border border-border-subtle shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-text-secondary">Slide {index + 1}</p>
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline">
                                      <ExternalLink size={11} />
                                      Open afbeelding
                                    </a>
                                  </div>
                                  <button type="button" onClick={() => removeMediaAt(index)} className="text-xs text-text-muted hover:text-red-400 transition-colors">
                                    Verwijder
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <img src={form.mediaUrls?.[0]} alt="Preview" className="w-full h-52 object-contain rounded-md border border-border-subtle bg-surface-2" />
                            <div className="mt-2 flex items-center justify-between">
                              <a
                                href={form.mediaUrls?.[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                              >
                                <ExternalLink size={11} />
                                Open afbeelding
                              </a>
                              <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, mediaUrl: undefined, mediaUrls: [] }))}
                                className="text-xs text-text-muted hover:text-text-primary transition-colors"
                              >
                                Verwijder
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">Type (meta)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {POST_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set('type', value)}
                        className={clsx(
                          'flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors',
                          form.type === value
                            ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                            : 'bg-surface-3 border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-default'
                        )}
                      >
                        <Icon size={13} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">Status (meta)</label>
                  <div className="grid grid-cols-1 gap-2">
                    {POST_STATUSES.map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set('status', value)}
                        className={clsx(
                          'w-full py-2 rounded-lg border text-xs font-medium transition-all',
                          form.status === value ? color : 'bg-surface-3 border-border-subtle text-text-muted hover:text-text-secondary'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Datum */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    {form.status === 'posted' ? 'Postdatum' : 'Geplande datum'}
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.date ?? ''}
                    onChange={(e) => set('date', e.target.value || undefined)}
                  />
                </div>
              </aside>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={submitLoading || uploading || !isDirty}
              className="px-4 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitLoading ? 'Opslaan...' : (savedState && !isDirty ? 'Opgeslagen' : 'Opslaan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
