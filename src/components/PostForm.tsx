import { useState, useEffect, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import {
  Image, Video, Film, Square, Layers, Upload, Loader2,
  ExternalLink, GripVertical, Share2, Copy, Trash2, X, Bold,
  Circle, CircleDot, Eye, CheckCheck, CheckCircle2,
} from 'lucide-react'
import type { Post, PostType, PostStatus, Client } from '../types'
import { supabase } from '../lib/supabase'
import { copyPostPreviewLink } from '../lib/previewLink'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { PillDropdown } from '@/components/ui/pill-dropdown'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

type FormData = Omit<Post, 'id' | 'createdAt' | 'updatedAt'>

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType }[] = [
  { value: 'foto', label: 'Foto', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'reel', label: 'Reel', icon: Film },
  { value: 'story', label: 'Story', icon: Square },
  { value: 'carousel', label: 'Carousel', icon: Layers },
]

const POST_STATUSES: { value: PostStatus; label: string; Icon: React.ElementType; color: string }[] = [
  { value: 'todo',        label: 'Te doen',              Icon: Circle,       color: 'text-zinc-400' },
  { value: 'in_progress', label: 'Bezig',                Icon: CircleDot,    color: 'text-orange-400' },
  { value: 'feedback',    label: 'Klaar voor feedback',  Icon: Eye,          color: 'text-blue-400' },
  { value: 'approved',    label: 'Goedgekeurd',          Icon: CheckCheck,   color: 'text-purple-400' },
  { value: 'posted',      label: 'Gepost',               Icon: CheckCircle2, color: 'text-green-400' },
]

const NONE_CLIENT = '__none__'

function PostClientSelect({
  value, onChange, clients, disabled,
}: {
  value: string
  onChange: (v: string) => void
  clients: Client[]
  disabled?: boolean
}) {
  const options = [NONE_CLIENT, ...clients.map(c => c.id)]
  return (
    <PillDropdown
      options={options}
      value={value || NONE_CLIENT}
      onChange={(v) => onChange(v === NONE_CLIENT ? '' : v)}
      disabled={disabled}
      renderLabel={(v) => {
        const name = v === NONE_CLIENT ? 'Klant' : (clients.find(c => c.id === v)?.companyName ?? 'Klant')
        return (
          <>
            <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="max-w-[120px] truncate">{name}</span>
          </>
        )
      }}
      renderOption={(v) => {
        if (v === NONE_CLIENT) return <span className="text-muted-foreground">Geen klant</span>
        const c = clients.find(x => x.id === v)!
        return <span>{c.companyName}</span>
      }}
    />
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => void | Promise<void>
  onDuplicate?: (data: FormData) => void | Promise<void>
  onDelete?: () => void | Promise<void>
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
  onDuplicate,
  onDelete,
  initial,
  clientId,
  clients = [],
  lockClient = false,
  sharePostId,
}: Props) {
  const [form, setForm] = useState<FormData>({
    clientId,
    type: 'foto',
    status: 'todo',
    caption: '',
    mediaUrl: '',
    mediaUrls: [],
    date: new Date().toISOString().slice(0, 10),
    ...initial,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedState, setSavedState] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const captionRef = useRef<HTMLTextAreaElement | null>(null)

  const initialRef = useRef(initial)
  const clientIdRef = useRef(clientId)
  useEffect(() => { initialRef.current = initial }, [initial])
  useEffect(() => { clientIdRef.current = clientId }, [clientId])

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false)
      return
    }
    const baseDate = new Date().toISOString().slice(0, 10)
    const nextForm: FormData = {
      clientId: clientIdRef.current,
      type: 'foto',
      status: 'todo',
      caption: '',
      mediaUrl: '',
      mediaUrls: [],
      date: baseDate,
      ...initialRef.current,
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
    setConfirmDelete(false)
    setInitialSnapshot(JSON.stringify(normalizedForm(nextForm)))

    // Focus caption after drawer open animation completes
    if (open) {
      window.setTimeout(() => captionRef.current?.focus(), 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const isDirty = useMemo(
    () => JSON.stringify(normalizedForm(form)) !== initialSnapshot,
    [form, initialSnapshot]
  )

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function normalizedForm(value: FormData) {
    const mediaUrls = value.mediaUrls ?? (value.mediaUrl ? [value.mediaUrl] : [])
    return { ...value, mediaUrls, mediaUrl: mediaUrls[0] ?? undefined }
  }

  async function uploadImage(file: File) {
    const bucket = import.meta.env.VITE_SUPABASE_POST_MEDIA_BUCKET || 'post-media'
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${form.clientId}/${crypto.randomUUID()}.${extension}`

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) {
      throw new Error('Je moet ingelogd zijn om media te uploaden.')
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 30_000)

    try {
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
            'Content-Type': file.type || 'application/octet-stream',
            'Cache-Control': '3600',
            'x-upsert': 'false',
          },
          body: file,
          signal: controller.signal,
        }
      )
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        console.error('[upload] error body:', err)
        throw new Error(err?.message ?? `Upload mislukt (HTTP ${response.status})`)
      }
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`
      return publicUrl
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error('[upload] aborted (timeout)')
        throw new Error('Upload timeout na 30 seconden — controleer je internetverbinding.')
      }
      console.error('[upload] caught error:', err)
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
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
    setUploadProgress(10)
    try {
      const uploadedUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i])
        uploadedUrls.push(url)
        setUploadProgress(Math.round(((i + 1) / files.length) * 90) + 10)
      }
      setForm((prev) => {
        const existing = prev.mediaUrls ?? (prev.mediaUrl ? [prev.mediaUrl] : [])
        const mediaUrls = [...existing, ...uploadedUrls]
        return { ...prev, mediaUrls, mediaUrl: mediaUrls[0] }
      })
    } catch (error) {
      console.error('[handleFileChange] upload failed:', error)
      setUploadError(error instanceof Error ? error.message : 'Uploaden is mislukt.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      e.target.value = ''
    }
  }

  function removeMediaAt(index: number) {
    setForm((prev) => {
      const current = prev.mediaUrls ?? (prev.mediaUrl ? [prev.mediaUrl] : [])
      const mediaUrls = current.filter((_, i) => i !== index)
      return { ...prev, mediaUrls, mediaUrl: mediaUrls[0] }
    })
  }

  function moveMedia(from: number, to: number) {
    setForm((prev) => {
      const current = [...(prev.mediaUrls ?? (prev.mediaUrl ? [prev.mediaUrl] : []))]
      if (from < 0 || to < 0 || from >= current.length || to >= current.length || from === to) return prev
      const [moved] = current.splice(from, 1)
      current.splice(to, 0, moved)
      return { ...prev, mediaUrls: current, mediaUrl: current[0] }
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
      const payload: FormData = { ...form, mediaUrls, mediaUrl: mediaUrls[0] }
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
    if (isDirty && savedState) setSavedState(false)
  }, [isDirty, savedState])

  function copyPreviewLink() {
    if (!sharePostId) {
      toast.error('Sla de post eerst op om een preview-link te delen')
      return
    }
    void copyPostPreviewLink(sharePostId).then((ok) => {
      if (ok) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    })
  }

  function toUnicodeBold(input: string): string {
    return Array.from(input).map((char) => {
      const code = char.codePointAt(0)
      if (!code) return char
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65))
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97))
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48))
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
      if (hasSelection) textarea.setSelectionRange(start, start + transformed.length)
      else textarea.setSelectionRange(0, transformed.length)
    })
  }

  async function handleDuplicate() {
    if (!onDuplicate) return
    await onDuplicate({ ...form, mediaUrls: form.mediaUrls ?? (form.mediaUrl ? [form.mediaUrl] : []) })
  }

  async function handleDelete() {
    setConfirmDelete(false)
    if (onDelete) await onDelete()
  }


  return (
    <Drawer
      open={open}
      onOpenChange={(v) => !v && onClose()}
      direction="right"
    // vaul drawers don't use Radix FocusScope — Popovers work natively
    >
      <DrawerContent className="inset-y-0 right-0 left-auto mt-0 h-full w-full sm:w-[500px] rounded-none border-l sm:rounded-l-xl flex flex-col [&>div:first-child]:hidden outline-none">
        <DrawerTitle className="sr-only">
          {initial?.id ? 'Post bewerken' : 'Nieuwe post maken'}
        </DrawerTitle>

        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1 sm:gap-1.5">
              <BreadcrumbItem>
                <span className="text-muted-foreground">Content</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="[&>svg]:size-3" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-muted-foreground">
                  {initial?.id ? 'Post bewerken' : 'Nieuwe post'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1">
            {sharePostId && (
              <Button
                type="button" variant="ghost" size="icon"
                onClick={copyPreviewLink}
                className="size-6 text-muted-foreground"
                title={copied ? 'Gekopieerd!' : 'Deel preview link'}
              >
                <Share2 className="size-3.5" />
              </Button>
            )}
            {onDuplicate && (
              <Button
                type="button" variant="ghost" size="icon"
                onClick={handleDuplicate}
                className="size-6 text-muted-foreground"
                title="Dupliceren"
              >
                <Copy className="size-3.5" />
              </Button>
            )}
            <Button
              type="button" variant="ghost" size="icon"
              onClick={onClose}
              className="size-6 text-muted-foreground"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">

          {/* Title */}
          <div className="px-5 pt-4 pb-2 shrink-0">
            <h2 className="text-base font-medium text-foreground">
              {initial?.id ? 'Post bewerken' : 'Nieuwe post maken'}
            </h2>
          </div>

          {/* Metadata row — status, client, type, date */}
          <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap shrink-0">

            {/* Status */}
            <PillDropdown
              options={POST_STATUSES.map(s => s.value)}
              value={form.status}
              onChange={(v) => set('status', v as PostStatus)}
              renderLabel={(v) => {
                const s = POST_STATUSES.find(x => x.value === v)!
                return <><s.Icon size={12} className={cn('shrink-0', s.color)} /><span>{s.label}</span></>
              }}
              renderOption={(v) => {
                const s = POST_STATUSES.find(x => x.value === v)!
                return <><s.Icon size={12} className={cn('shrink-0', s.color)} /><span>{s.label}</span></>
              }}
            />

            {/* Client */}
            {clients.length > 0 && (
              <PostClientSelect
                value={form.clientId}
                onChange={(v) => set('clientId', v)}
                clients={clients}
                disabled={lockClient}
              />
            )}

            {/* Type */}
            <PillDropdown
              options={POST_TYPES.map(t => t.value)}
              value={form.type}
              onChange={(v) => set('type', v as PostType)}
              renderLabel={(v) => {
                const t = POST_TYPES.find(x => x.value === v)!
                const Icon = t.icon
                return <><Icon className="size-3 shrink-0" /><span>{t.label}</span></>
              }}
              renderOption={(v) => {
                const t = POST_TYPES.find(x => x.value === v)!
                const Icon = t.icon
                return <><Icon className="size-3 shrink-0 text-muted-foreground" /><span>{t.label}</span></>
              }}
            />

            {/* Date */}
            <DatePickerButton
              value={form.date}
              onChange={(v) => set('date', v)}
            />

          </div>

          {/* Photo upload */}
          <div className="px-5 pt-3 pb-3 border-b border-border shrink-0">
            {(form.mediaUrls?.length ?? 0) === 0 ? (
              <label className={cn(
                'w-full flex flex-col items-center justify-center gap-2 bg-muted/30 border border-border rounded-lg py-8 transition-colors',
                uploading
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              )}>
                {uploading
                  ? <Loader2 className="size-5 animate-spin" />
                  : <Upload className="size-5" />}
                <span className="text-sm">
                  {uploading ? 'Uploaden...' : 'Voeg foto(s) toe'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple={form.type === 'carousel'}
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                {form.type === 'carousel' ? (
                  <div className="p-2 space-y-2">
                    {form.mediaUrls?.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex !== null) {
                            moveMedia(dragIndex, index)
                            setDragIndex(null)
                          }
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className="flex items-center gap-2 rounded border border-border bg-muted/30 p-2"
                      >
                        <GripVertical className="size-3 text-muted-foreground shrink-0 cursor-grab" />
                        <img
                          src={url}
                          alt={`Slide ${index + 1}`}
                          className="size-10 object-cover rounded shrink-0"
                        />
                        <span className="text-xs text-muted-foreground flex-1">
                          Slide {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMediaAt(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <Upload className="size-3" />
                      Meer toevoegen
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <img
                      src={form.mediaUrls?.[0]}
                      alt="Preview"
                      className="w-full max-h-64 object-contain bg-background"
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                      <a
                        href={form.mediaUrls?.[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <ExternalLink className="size-2.5" /> Open
                      </a>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, mediaUrl: undefined, mediaUrls: [] }))}
                        className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Verwijder
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {uploading && uploadProgress > 0 && (
              <div className="mt-2">
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}
            {uploadError && (
              <p className="text-xs text-destructive mt-2">{uploadError}</p>
            )}
          </div>

          {/* Caption — grows to fill remaining space */}
          <div className="relative flex-1 min-h-0 flex flex-col px-5 pt-3 pb-1">
            <Textarea
              ref={captionRef}
              placeholder="Begin hier met het schrijven van de caption..."
              value={form.caption}
              onChange={(e) => set('caption', e.target.value)}
              className="flex-1 min-h-0 pr-10 bg-transparent border-none shadow-none outline-none text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:border-none focus:text-foreground resize-none leading-relaxed overflow-y-auto"
            />
            {/* Bold toolbar — pinned top-right of caption area */}
            <div className="absolute top-5 right-8">
              <button
                type="button"
                onClick={applyBoldToSelection}
                title="Vet (Unicode bold)"
                className="bg-background border border-border flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Bold className="size-3" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              {onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Verwijderen?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="text-destructive hover:text-red-300 font-medium transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Nee
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete(true)}
                    className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={submitLoading || uploading || !isDirty}
              className="h-7 text-xs"
            >
              {submitLoading
                ? 'Opslaan...'
                : savedState && !isDirty
                  ? 'Opgeslagen ✓'
                  : 'Opslaan'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
