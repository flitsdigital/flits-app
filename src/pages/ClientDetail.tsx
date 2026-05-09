import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "../components/PageHeader";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Receipt,
  CalendarDays,
  Package,
  ChevronDown,
  ChevronRight,
  Plus,
  Image,
  Video,
  Film,
  Square,
  Layers,
  ExternalLink,
  Share2,
  Check,
} from "lucide-react";
import { parseISO, format } from "date-fns";
import { useStore } from "../store/useStore";
import {
  getInvoiceStatus,
  formatDate,
  formatWeek,
  formatWeekDate,
  formatCycle,
  getInvoiceTimeline,
  getPastInvoiceDates,
} from "../lib/billing";
import { StatusBadge } from "../components/StatusBadge";
import { InvoiceBadge } from "../components/InvoiceBadge";
import { ClientForm } from "../components/ClientForm";
import { PostForm } from "../components/PostForm";
import {
  postTypeLabel,
  postStatusLabel,
  postStatusColor,
  postStatusDot,
} from "../lib/postHelpers";
import type { Client, Post, PostType } from "../types";

const TYPE_ICON: Record<PostType, React.ElementType> = {
  foto: Image,
  video: Video,
  reel: Film,
  story: Square,
  carousel: Layers,
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="text-text-muted mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm text-text-primary mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getClient,
    updateClient,
    deleteClient,
    toggleInvoiced,
    posts,
    addPost,
    updatePost,
    deletePost,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const client = getClient(id ?? "");

  if (!client) {
    return (
      <div className="px-8 py-8 text-center">
        <p className="text-text-muted">Klant niet gevonden.</p>
        <Link
          to="/clients"
          className="text-accent-blue text-sm mt-2 inline-block"
        >
          ← Terug naar klanten
        </Link>
      </div>
    );
  }

  const next = client.nextInvoiceDate ? parseISO(client.nextInvoiceDate) : null;
  const invoiceStatus = next ? getInvoiceStatus(next) : "ok";
  const futureDates = getInvoiceTimeline(client, 52).filter(
    (d) => d >= new Date(),
  );
  const pastDates = getPastInvoiceDates(client);
  const clientPosts = posts
    .filter((p) => p.clientId === client.id)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  function handleDelete() {
    deleteClient(client!.id);
    navigate("/clients");
  }

  async function copyPreviewLink(postId: string) {
    const link = `${window.location.origin}/preview/${postId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedPostId(postId);
      window.setTimeout(
        () =>
          setCopiedPostId((current) => (current === postId ? null : current)),
        1800,
      );
    } catch {
      window.prompt("Kopieer deze preview link:", link);
    }
  }

  return (
    <div>
      <PageHeader
        title={client.companyName}
        breadcrumbs={[
          { label: 'Klanten', href: '/clients' },
          { label: client.companyName },
        ]}
      />
    <div className="px-6 py-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-blue/20 flex items-center justify-center">
            <span className="text-sm font-bold text-accent-blue">
              {client.companyName.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">
              {client.companyName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={client.status} />
              {client.packageType && (
                <span className="text-xs text-text-muted">
                  {client.packageType}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-7 text-xs gap-1.5">
            <Edit2 size={13} />
            Bewerken
          </Button>
          <Button variant="outline" size="icon" onClick={() => setConfirmDelete(true)} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/25">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-5">
          {/* Factuurstatus */}
          {client.status === "active" && (
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                Facturatie
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-3 rounded-lg p-3.5">
                  <p className="text-xs text-text-muted mb-1">Vorige factuur</p>
                  <p className="text-sm font-medium text-text-primary">
                    {formatWeek(client.lastInvoiceDate)}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatWeekDate(client.lastInvoiceDate)}
                  </p>
                </div>
                <div className="bg-surface-3 rounded-lg p-3.5">
                  <p className="text-xs text-text-muted mb-1">
                    Volgende factuur
                  </p>
                  <div className="mt-1">
                    <p className="text-sm font-medium text-text-primary">
                      {formatWeek(client.nextInvoiceDate)}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatWeekDate(client.nextInvoiceDate)}
                    </p>
                    <div className="mt-1.5">
                      <InvoiceBadge status={invoiceStatus} />
                    </div>
                  </div>
                </div>
                <div className="bg-surface-3 rounded-lg p-3.5">
                  <p className="text-xs text-text-muted mb-1">
                    Prijs per cyclus
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    €{client.pricePerCycle.toLocaleString("nl-NL")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aankomende factuurmomenten */}
          <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Aankomende factuurmomenten
            </h2>
            <div className="flex flex-wrap gap-2">
              {futureDates.map((date, i) => {
                const status = getInvoiceStatus(date);
                return (
                  <div
                    key={i}
                    className={`px-2.5 py-1.5 rounded-lg border ${
                      status === "overdue"
                        ? "bg-red-500/15 text-red-400 border-red-500/25"
                        : status === "this_week"
                          ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                          : status === "upcoming"
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                            : "bg-surface-3 text-text-secondary border-border-subtle"
                    }`}
                    title={formatDate(date.toISOString())}
                  >
                    <span className="text-xs font-semibold">
                      {formatWeek(date)}
                    </span>
                    <span className="text-xs opacity-60 ml-1">
                      {formatWeekDate(date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vorige factuurmomenten — Accordion */}
          {pastDates.length > 0 && (
            <Accordion type="single" collapsible className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <AccordionItem value="history" className="border-none">
                <AccordionTrigger className="px-4 py-2.5 text-left hover:no-underline hover:bg-white/[0.03] [&>svg]:text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Vorige factuurmomenten
                    </span>
                    <span className="text-xs text-text-muted bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded-md">
                      {pastDates.filter(d => {
                        const key = format(d, 'yyyy-MM-dd')
                        return client.invoiceRecords?.find(r => r.date === key)?.invoiced
                      }).length}/{pastDates.length} gefactureerd
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="border-t border-border-subtle divide-y divide-border-subtle">
                    {pastDates.map((date, i) => {
                      const key = format(date, 'yyyy-MM-dd')
                      const record = client.invoiceRecords?.find(r => r.date === key)
                      const invoiced = record?.invoiced ?? false
                      return (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleInvoiced(client.id, key)}
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${invoiced ? 'bg-green-500 border-green-500 text-white' : 'border-border-default hover:border-zinc-400 bg-transparent'}`}
                            >
                              {invoiced && <Check size={11} strokeWidth={3} />}
                            </button>
                            <div>
                              <span className="text-sm font-medium text-text-primary">{formatWeek(date)}</span>
                              <span className="text-xs text-text-muted ml-2">{formatDate(key)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-text-secondary">€{client.pricePerCycle.toLocaleString('nl-NL')}</span>
                            {invoiced ? (
                              <span className="text-xs text-green-400 font-medium">Gefactureerd</span>
                            ) : (
                              <span className="text-xs text-text-muted">Niet gefactureerd</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Notities
              </h2>
              <p className="text-sm text-text-secondary whitespace-pre-line">
                {client.notes}
              </p>
            </div>
          )}

          {/* Posts */}
          <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Content
                <span className="ml-2 text-text-muted bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded-md font-normal normal-case tracking-normal">
                  {clientPosts.length} posts
                </span>
              </h2>
              <button
                onClick={() => {
                  setEditingPost(null);
                  setPostFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-blue hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
              >
                <Plus size={13} />
                Post toevoegen
              </button>
            </div>

            {clientPosts.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-text-muted">
                Nog geen posts. Voeg de eerste toe.
              </div>
            )}

            <div className="divide-y divide-border-subtle">
              {clientPosts.map((post) => {
                const Icon = TYPE_ICON[post.type];
                const primaryMediaUrl = post.mediaUrls?.[0] ?? post.mediaUrl;
                const mediaCount =
                  post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0);
                return (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Type icon */}
                    <div className="w-6 h-6 rounded bg-surface-3 border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={12} className="text-text-muted" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-md border ${postStatusColor[post.status]}`}
                        >
                          {postStatusLabel(post.status)}
                        </span>
                        <span className="text-xs text-text-muted">
                          {postTypeLabel(post.type)}
                        </span>
                        {post.date && (
                          <span className="text-xs text-text-muted">
                            · {format(parseISO(post.date), "d MMM yyyy")}
                          </span>
                        )}
                      </div>
                      {post.caption && (
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {post.caption}
                        </p>
                      )}
                      {primaryMediaUrl && (
                        <a
                          href={primaryMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={11} />
                          {post.type === "carousel" && mediaCount > 1
                            ? `${mediaCount} afbeeldingen`
                            : "Media bekijken"}
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => copyPreviewLink(post.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
                        title="Share preview"
                      >
                        {copiedPostId === post.id ? (
                          <Check size={13} />
                        ) : (
                          <Share2 size={13} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPost(post);
                          setPostFormOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Contact */}
          <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Contact
            </h2>
            <div className="space-y-3.5">
              <InfoRow icon={Mail} label="E-mail" value={client.email} />
              <InfoRow icon={Phone} label="Telefoon" value={client.phone} />
              <InfoRow icon={MapPin} label="Adres" value={client.address} />
              <InfoRow
                icon={Receipt}
                label="BTW nummer"
                value={client.vatNumber}
              />
            </div>
          </div>

          {/* Contract */}
          <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Contract
            </h2>
            <div className="space-y-3.5">
              <InfoRow
                icon={CalendarDays}
                label="Startdatum"
                value={formatDate(client.startDate)}
              />
              {client.endDate && (
                <InfoRow
                  icon={CalendarDays}
                  label="Einddatum"
                  value={formatDate(client.endDate)}
                />
              )}
              <InfoRow
                icon={Package}
                label="Pakket"
                value={client.packageType}
              />
              <div className="flex items-start gap-3">
                <Receipt
                  size={15}
                  className="text-text-muted mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-xs text-text-muted">Facturatiecyclus</p>
                  <p className="text-sm text-text-primary mt-0.5">
                    {formatCycle(client.billingCycle, client.customCycleDays)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <ClientForm
        open={editing}
        onClose={() => setEditing(false)}
        onSave={(data) => {
          updateClient(client.id, data);
          toast.success('Klant bijgewerkt')
          setEditing(false);
        }}
        initial={client}
        title="Klant bewerken"
      />

      {/* Post form */}
      <PostForm
        open={postFormOpen}
        onClose={() => {
          setPostFormOpen(false);
          setEditingPost(null);
        }}
        onSave={async (data) => {
          if (editingPost) {
            await updatePost(editingPost.id, data);
            toast.success('Post opgeslagen')
          } else {
            const created = await addPost(data);
            toast.success('Post aangemaakt')
            setEditingPost(created);
          }
        }}
        onDelete={editingPost ? async () => {
          await deletePost(editingPost.id);
          toast.success('Post verwijderd')
          setPostFormOpen(false);
          setEditingPost(null);
        } : undefined}
        onDuplicate={async (data) => {
          await addPost(data)
          toast.success('Post gedupliceerd')
        }}
        initial={editingPost ?? undefined}
        clientId={client.id}
        clients={[client]}
        lockClient
        sharePostId={editingPost?.id}
        title={editingPost ? "Post bewerken" : "Post toevoegen"}
      />

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Klant verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Weet je zeker dat je <strong className="text-foreground">{client.companyName}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1">Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">Verwijderen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
