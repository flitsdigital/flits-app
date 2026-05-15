import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Trash2, Phone, Mail, Users, MessageSquare, Calendar, ArrowRight, ChevronDown, Paperclip, Upload, FileText, X, Download, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { PageHeader } from '../components/PageHeader'
import { LeadForm } from '../components/LeadForm'
import { ClientForm } from '../components/ClientForm'
import { MentionTextarea, parseMentions } from '../components/MentionTextarea'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { InitialsAvatar } from '../components/InitialsAvatar'
import { PageSection } from '../components/PageSection'
import { useLeadsData, useContactMoments } from '../hooks/useLeadsData'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { LEAD_STATUS_CONFIG } from './Leads'
import { notificationsDb } from '../lib/notificationsDb'
import { projectsDb } from '../lib/projectsDb'
import { leadsDb } from '../lib/leadsDb'
import type { Lead, LeadStatus, ContactMomentType, Client, LeadAttachment } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ── Status config ─────────────────────────────────────────────────────────────

const PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Doorverwijzing',
  linkedin: 'LinkedIn',
  cold_outreach: 'Cold outreach',
  event: 'Evenement',
  other: 'Anders',
}

const MOMENT_TYPE_CONFIG: Record<ContactMomentType, { label: string; icon: React.ElementType; color: string }> = {
  call:    { label: 'Telefoongesprek', icon: Phone,        color: 'text-blue-400 bg-blue-500/10' },
  email:   { label: 'E-mail',          icon: Mail,         color: 'text-purple-400 bg-purple-500/10' },
  meeting: { label: 'Meeting',         icon: Users,        color: 'text-green-400 bg-green-500/10' },
  other:   { label: 'Anders',          icon: MessageSquare, color: 'text-zinc-400 bg-zinc-500/10' },
}

// ── Status pill dropdown ──────────────────────────────────────────────────────

function StatusDropdown({ status, onChange }: { status: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = LEAD_STATUS_CONFIG[status]

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors', cfg.badge)}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
        {cfg.label}
        <ChevronDown size={11} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-surface-3 border border-border-default rounded-lg shadow-xl py-1 min-w-[160px]">
          {PIPELINE.map((s) => {
            const c = LEAD_STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/[0.05] transition-colors',
                  s === status && 'opacity-50 pointer-events-none'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border-subtle/40 last:border-0">
      <span className="text-[10px] text-text-disabled uppercase tracking-wide font-medium">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-sm text-accent-blue hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-sm text-text-primary">{value}</span>
      )}
    </div>
  )
}

// ── Add contact moment form ───────────────────────────────────────────────────

function AddMomentForm({ leadId, addMoment, onAdded }: {
  leadId: string
  addMoment: ReturnType<typeof useContactMoments>['addMoment']
  onAdded: (date: string) => void
}) {
  const profile = useAuthStore((s) => s.profile)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ContactMomentType>('call')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    try {
      await addMoment({
        leadId,
        date,
        type,
        note: note.trim(),
        actorId: profile?.id,
        actorEmail: profile?.email,
      })
      toast.success('Contactmoment toegevoegd')

      // Process @mentions
      if (profile?.email) {
        try {
          const allProfiles = await projectsDb.fetchProfilesBasic()
          const emails = parseMentions(note.trim(), allProfiles)
          for (const email of emails) {
            const target = allProfiles.find(p => p.email === email)
            if (!target) continue
            await notificationsDb.create({
              userId: target.id,
              actorEmail: profile.email,
              type: 'mention',
              content: `${profile.name ?? profile.email} noemde jou in een contactmoment`,
              linkedType: 'contact_moment',
              linkedId: leadId,
              contextUrl: `/leads/${leadId}`,
            })
          }
        } catch { /* non-critical */ }
      }

      setNote('')
      setOpen(false)
      onAdded(date)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors py-1"
        >
          <span className="w-5 h-5 rounded-full bg-surface-3 border border-border-default flex items-center justify-center text-text-muted">+</span>
          Contactmoment toevoegen
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface-3 border border-border-default rounded-xl p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ContactMomentType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MOMENT_TYPE_CONFIG) as ContactMomentType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {MOMENT_TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Notitie</Label>
            <MentionTextarea
              value={note}
              onChange={setNote}
              placeholder="Beschrijf het contactmoment... gebruik @ om iemand te taggen"
              rows={3}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:border-ring transition-colors"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuleren</Button>
            <Button type="submit" size="sm" disabled={saving || !note.trim()}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Attachments ───────────────────────────────────────────────────────────────

function LeadAttachments({ leadId, userId }: { leadId: string; userId?: string }) {
  const [attachments, setAttachments] = useState<LeadAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    leadsDb.fetchAttachments(leadId).then(setAttachments).finally(() => setLoading(false))
  }, [leadId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) { toast.error('Alleen PDF-bestanden zijn toegestaan'); return }

    setUploading(true)
    try {
      const uploaded = await Promise.all(pdfs.map(f => leadsDb.uploadAttachment(leadId, f, userId)))
      setAttachments(prev => [...uploaded, ...prev])
      toast.success(`${uploaded.length} bestand${uploaded.length > 1 ? 'en' : ''} geüpload`)
    } catch (e) {
      toast.error('Upload mislukt', { description: String(e) })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(a: LeadAttachment) {
    if (!window.confirm(`"${a.fileName}" verwijderen?`)) return
    try {
      await leadsDb.deleteAttachment(a.id, a.storagePath)
      setAttachments(prev => prev.filter(x => x.id !== a.id))
    } catch (e) {
      toast.error('Verwijderen mislukt', { description: String(e) })
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
          <Paperclip size={12} />
          Bijlagen
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? 'Bezig...' : 'PDF uploaden'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => attachments.length === 0 && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg transition-colors',
          dragging ? 'border-accent-blue/60 bg-accent-blue/5' : 'border-border-subtle',
          attachments.length === 0 ? 'py-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-zinc-600' : 'hidden',
        )}
      >
        <Upload size={18} className="text-text-muted" />
        <p className="text-xs text-text-muted">Sleep PDF's hierheen of klik om te uploaden</p>
      </div>

      {/* File list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-10 bg-surface-3 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          className={cn('space-y-1.5', dragging && attachments.length > 0 && 'border border-accent-blue/30 rounded-lg p-1')}
        >
          {attachments.map(a => (
            <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-3 rounded-lg group">
              <FileText size={14} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">{a.fileName}</p>
                {a.fileSize && <p className="text-[10px] text-text-muted">{formatSize(a.fileSize)}</p>}
              </div>
              <a
                href={leadsDb.getAttachmentUrl(a.storagePath)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                title="Downloaden"
              >
                <Download size={13} />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(a)}
                className="p-1 text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Verwijderen"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Contact log timeline ──────────────────────────────────────────────────────

function ContactLog({ leadId, onLastContactUpdate }: {
  leadId: string
  onLastContactUpdate: (date: string) => void
}) {
  const { moments, loading, addMoment, deleteMoment } = useContactMoments(leadId)

  async function handleDelete(id: string) {
    if (!window.confirm('Contactmoment verwijderen?')) return
    await deleteMoment(id)
    toast.success('Verwijderd')
  }

  function handleAdded(date: string) {
    onLastContactUpdate(date)
  }

  return (
    <div className="flex flex-col gap-4">
      <AddMomentForm leadId={leadId} addMoment={addMoment} onAdded={handleAdded} />

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-3 border border-border-subtle animate-pulse" />
          ))}
        </div>
      )}

      {!loading && moments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar size={20} className="text-text-muted mb-2 opacity-40" />
          <p className="text-xs text-text-muted">Nog geen contactmomenten</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {moments.map((moment) => {
          const cfg = MOMENT_TYPE_CONFIG[moment.type]
          const Icon = cfg.icon
          return (
            <div
              key={moment.id}
              className="flex gap-3 group"
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.color)}>
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-text-primary">{cfg.label}</span>
                  <span className="text-xs text-text-muted">
                    {format(parseISO(moment.date), 'd MMMM yyyy', { locale: nl })}
                  </span>
                  {moment.actorEmail && (
                    <span className="text-xs text-text-muted opacity-60">— {moment.actorEmail}</span>
                  )}
                  <button
                    onClick={() => handleDelete(moment.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{moment.note}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { leads, loading, updateLead, updateLeadStatus, deleteLead } = useLeadsData()
  const { addClient, addClientInvoice } = useStore()
  const profile = useAuthStore((s) => s.profile)

  const [showEditForm, setShowEditForm] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lead = leads.find((l) => l.id === id)

  usePageMeta(
    lead ? `${lead.companyName} → Leads` : 'Lead → Flits Impact',
    'Leaddetails en contacthistorie.'
  )

  useEffect(() => {
    if (lead) setNotesValue(lead.notes ?? '')
  }, [lead?.id])

  function handleNotesChange(value: string) {
    setNotesValue(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      setNotesSaving(true)
      await updateLead(id!, { notes: value })
      setNotesSaving(false)
    }, 800)
  }

  async function handleStatusChange(status: LeadStatus) {
    await updateLeadStatus(id!, status)
    toast.success(`Status gewijzigd naar ${LEAD_STATUS_CONFIG[status].label}`)
  }

  async function handleDelete() {
    await deleteLead(id!)
    toast.success('Lead verwijderd')
    navigate('/leads')
  }

  if (!loading && !lead) {
    return (
      <div className="px-8 py-8 text-center">
        <p className="text-text-muted mb-2">Lead niet gevonden.</p>
        <Link to="/leads" className="text-accent-blue text-sm">← Terug naar leads</Link>
      </div>
    )
  }

  if (loading || !lead) {
    return (
      <div className="px-4 lg:px-6 py-4 lg:py-6 flex flex-col gap-4">
        <div className="h-8 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="h-64 bg-surface-2 rounded-xl animate-pulse" />
          <div className="h-64 bg-surface-2 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  const cfg = LEAD_STATUS_CONFIG[lead.status]

  return (
    <div>
      <PageHeader
        title={lead.companyName}
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: lead.companyName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusDropdown status={lead.status} onChange={handleStatusChange} />
            <Button size="sm" variant="outline" onClick={() => setShowEditForm(true)} className="h-7 text-xs gap-1.5">
              <Edit2 size={12} />
              Bewerken
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteOpen(true)} className="h-7 w-7 p-0 text-text-muted hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25">
              <Trash2 size={13} />
            </Button>
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-4 lg:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 lg:gap-6 items-start">

          {/* Left: Info panel */}
          <div className="flex flex-col gap-4">

            {/* Identity */}
            <PageSection>
              <div className="p-4">
                <div className="flex items-center gap-3 pb-3 mb-1 border-b border-border-subtle/60">
                  <InitialsAvatar name={lead.companyName} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{lead.companyName}</p>
                    {lead.contactPerson && (
                      <p className="text-xs text-text-muted">{lead.contactPerson}</p>
                    )}
                  </div>
                </div>
                <InfoRow label="E-mail" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                <InfoRow label="Telefoon" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                <InfoRow label="Bron" value={lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : undefined} />
                {lead.estimatedValue != null && (
                  <InfoRow label="Geschatte waarde" value={`€${lead.estimatedValue.toLocaleString('nl-NL')}`} />
                )}
                {lead.lastContactedAt && (
                  <InfoRow
                    label="Laatste contact"
                    value={format(parseISO(lead.lastContactedAt), 'd MMMM yyyy', { locale: nl })}
                  />
                )}
                <InfoRow
                  label="Aangemaakt op"
                  value={format(parseISO(lead.createdAt), 'd MMMM yyyy', { locale: nl })}
                />
              </div>
            </PageSection>

            {/* Notes */}
            <PageSection
              title="Notities"
              icon={FileText}
              action={notesSaving ? <span className="text-[10px] text-text-muted">Opslaan...</span> : undefined}
            >
              <div className="p-3">
                <MentionTextarea
                  value={notesValue}
                  onChange={handleNotesChange}
                  placeholder="Aantekeningen over deze lead... gebruik @ om iemand te taggen"
                  rows={5}
                  className="text-sm"
                />
              </div>
            </PageSection>

            {/* Attachments */}
            <LeadAttachments leadId={lead.id} userId={profile?.id} />

            {/* Convert to client */}
            {lead.status === 'won' && (
              <div className="bg-green-500/[0.08] border border-green-500/25 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-green-400">Lead gewonnen!</p>
                  <p className="text-xs text-text-muted mt-0.5">Zet deze lead om naar een klant om te beginnen met facturatie en content.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowClientForm(true)}
                  className="bg-green-600 hover:bg-green-500 text-white w-full gap-1.5"
                >
                  Omzetten naar klant
                  <ArrowRight size={13} />
                </Button>
              </div>
            )}
          </div>

          {/* Right: Contact log */}
          <PageSection title="Contacthistorie" icon={Calendar}>
            <div className="p-4 lg:p-5">
              <ContactLog
                leadId={lead.id}
                onLastContactUpdate={(date) => updateLead(lead.id, { lastContactedAt: date })}
              />
            </div>
          </PageSection>
        </div>
      </div>

      <LeadForm
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={async (data) => {
          await updateLead(lead.id, data)
          toast.success('Lead bijgewerkt')
          setShowEditForm(false)
        }}
        initial={lead}
      />

      {/* Convert to client: prefill with lead data */}
      <ClientForm
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSave={async (data) => {
          const { pendingInvoices, ...rest } = data
          const created = await addClient(rest)
          if (pendingInvoices?.length) {
            for (const p of pendingInvoices) {
              await addClientInvoice({ ...p, clientId: created.id })
            }
          }
          await updateLeadStatus(lead.id, 'won')
          toast.success(`${lead.companyName} toegevoegd als klant`)
          setShowClientForm(false)
          navigate('/clients')
        }}
        initial={{
          companyName: lead.companyName,
          contactPerson: lead.contactPerson,
          email: lead.email,
          phone: lead.phone ?? '',
        } satisfies Partial<Client>}
      />
    </div>
  )
}
