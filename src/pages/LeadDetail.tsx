import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Trash2, Phone, Mail, Globe, Users, MessageSquare, Calendar, ArrowRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { PageHeader } from '../components/PageHeader'
import { LeadForm } from '../components/LeadForm'
import { ClientForm } from '../components/ClientForm'
import { useLeadsData, useContactMoments } from '../hooks/useLeadsData'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { usePageMeta } from '../hooks/usePageMeta'
import { LEAD_STATUS_CONFIG } from './Leads'
import type { Lead, LeadStatus, ContactMomentType, Client } from '../types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted">{label}</span>
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
          <div className="grid grid-cols-2 gap-3">
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
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Beschrijf het contactmoment..."
              rows={3}
              required
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
  const { addClient } = useStore()

  const [showEditForm, setShowEditForm] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
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
    if (!window.confirm(`${lead?.companyName} verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
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
      <div className="px-6 py-6 flex flex-col gap-4">
        <div className="h-8 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="grid grid-cols-[320px_1fr] gap-6">
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
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: lead.companyName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusDropdown status={lead.status} onChange={handleStatusChange} />
            <Button size="sm" variant="ghost" onClick={() => setShowEditForm(true)} className="h-7 text-xs">
              Bewerken
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 size={13} />
            </Button>
          </div>
        }
      />

      <div className="px-6 py-5">
        <div className="grid grid-cols-[320px_1fr] gap-6 items-start">

          {/* Left: Info panel */}
          <div className="flex flex-col gap-4">

            {/* Identity */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-2 border-b border-border-subtle">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/20 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-accent-blue">{lead.companyName.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{lead.companyName}</p>
                  <p className="text-xs text-text-muted">{lead.contactPerson}</p>
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
              <div className="flex flex-col gap-0.5 pt-1 border-t border-border-subtle">
                <span className="text-xs text-text-muted">Aangemaakt op</span>
                <span className="text-sm text-text-secondary">
                  {format(parseISO(lead.createdAt), 'd MMMM yyyy', { locale: nl })}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Notities</span>
                {notesSaving && <span className="text-xs text-text-muted">Opslaan...</span>}
              </div>
              <Textarea
                value={notesValue}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Aantekeningen over deze lead..."
                rows={5}
                className="text-sm resize-none bg-transparent border-none px-0 py-0 focus-visible:ring-0 placeholder:text-text-muted"
              />
            </div>

            {/* Convert to client */}
            {lead.status === 'won' && (
              <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-green-400">Lead gewonnen!</p>
                  <p className="text-xs text-text-muted mt-0.5">Zet deze lead om naar een klant om te beginnen met facturatie en content.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowClientForm(true)}
                  className="bg-green-500 hover:bg-green-400 text-white w-full gap-1.5"
                >
                  Omzetten naar klant
                  <ArrowRight size={13} />
                </Button>
              </div>
            )}
          </div>

          {/* Right: Contact log */}
          <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-text-primary">Contacthistorie</h2>
            </div>
            <Separator className="bg-border-subtle mb-5" />
            <ContactLog
              leadId={lead.id}
              onLastContactUpdate={(date) => updateLead(lead.id, { lastContactedAt: date })}
            />
          </div>
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
          await addClient(data)
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
