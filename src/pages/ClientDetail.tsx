import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "../components/PageHeader";
import {
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Receipt,
  CalendarDays,
  Package,
  Plus,
  Image,
  Video,
  Film,
  Square,
  Layers,
  ExternalLink,
  Share2,
  Check,
  FolderKanban,
  ArrowRight,
} from "lucide-react";
import { parseISO, format } from "date-fns";
import { nl } from "date-fns/locale";
import { useStore } from "../store/useStore";
import { projectsDb } from "../lib/projectsDb";
import { formatDate, formatWeek, formatWeekDate, formatCycle } from "../lib/billing";
import { StatusBadge } from "../components/StatusBadge";
import { InvoiceBadge } from "../components/InvoiceBadge";
import { ClientForm } from "../components/ClientForm";
import { ClientTypeBadge } from "../components/ClientTypeBadge";
import { ClientBillingSection } from "../components/ClientBillingSection";
import { PostForm } from "../components/PostForm";
import {
  postTypeLabel,
  postStatusLabel,
  postStatusColor,
} from "../lib/postHelpers";
import type { Client, Post, PostType, ClientType, Project } from "../types";
import { useClientStatsForClient } from "../hooks/useClientStats";

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
    posts,
    addPost,
    updatePost,
    deletePost,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<string, number>>({});

  const client = getClient(id ?? "");
  const stats = useClientStatsForClient(client);

  useEffect(() => {
    if (!client) return
    setProjectsLoading(true)
    projectsDb.fetchProjectsForClient(client.id)
      .then(async (projects) => {
        setClientProjects(projects)
        const counts: Record<string, number> = {}
        await Promise.all(
          projects.map(async (p) => {
            const tasks = await projectsDb.fetchProjectTasks(p.id)
            counts[p.id] = tasks.length
          })
        )
        setProjectTaskCounts(counts)
      })
      .catch(console.error)
      .finally(() => setProjectsLoading(false))
  }, [client?.id])

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

  const ct = client.clientType ?? "recurring";

  return (
    <div>
      <PageHeader
        title={client.companyName}
        breadcrumbs={[
          { label: "Klanten", href: "/clients" },
          { label: client.companyName },
        ]}
      />
      <div className="px-4 lg:px-6 py-4 lg:py-5 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent-blue/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-accent-blue">
                {client.companyName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-text-primary truncate">
                {client.companyName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <ClientTypeBadge type={client.clientType} />
                <StatusBadge status={client.status} />
                {client.packageType && (
                  <span className="text-xs text-text-muted truncate">{client.packageType}</span>
                )}
              </div>
              {stats && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ct === "recurring" && client.status === "active" && client.nextInvoiceDate && (
                    <>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 border border-border-subtle text-text-muted">
                        Volgende: {formatWeek(client.nextInvoiceDate)}{" "}
                        {formatWeekDate(client.nextInvoiceDate)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 border border-border-subtle text-text-muted">
                        €{client.pricePerCycle.toLocaleString("nl-NL")} / cyclus
                      </span>
                    </>
                  )}
                  {ct === "project" && stats.progress && (
                    <>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 border border-border-subtle text-text-muted">
                        Voortgang {stats.progress.pct}% ({stats.progress.paidCount}/{stats.progress.totalCount}{" "}
                        termijnen)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 border border-border-subtle text-text-muted">
                        Open €{stats.openAmount.toLocaleString("nl-NL")}
                      </span>
                    </>
                  )}
                  {ct === "oneoff" && stats.singleInvoice && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 border border-border-subtle text-text-muted">
                      €{stats.singleInvoice.amount.toLocaleString("nl-NL")} —{" "}
                      {formatDate(stats.singleInvoice.dueDate)} ({stats.singleInvoice.status})
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-3 border border-border-subtle text-text-muted">
                    {stats.postsThisWeek} posts deze week
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-8 lg:h-7 text-xs gap-1.5"
            >
              <Edit2 size={13} />
              <span className="hidden sm:inline">Bewerken</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              className="h-8 w-8 lg:h-7 lg:w-7 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/25"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className="h-9 w-full sm:w-auto justify-start overflow-x-auto scrollbar-none">
            <TabsTrigger value="overview" className="text-xs shrink-0">
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-xs shrink-0">
              Facturatie
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs shrink-0">
              Content
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs shrink-0 gap-1.5">
              <FolderKanban size={12} />
              Projecten
              {clientProjects.length > 0 && (
                <span className="ml-0.5 text-[10px] bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded-md text-text-muted font-normal">
                  {clientProjects.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                {client.notes ? (
                  <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
                    <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Notities
                    </h2>
                    <p className="text-sm text-text-secondary whitespace-pre-line">{client.notes}</p>
                  </div>
                ) : (
                  <div className="bg-surface-2 border border-border-subtle rounded-xl p-5 text-xs text-text-muted">
                    Geen notities.
                  </div>
                )}
                {ct === "recurring" && client.status === "active" && client.nextInvoiceDate && (
                  <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
                    <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Volgende factuur
                    </h2>
                    <p className="text-sm font-medium text-text-primary">
                      {formatWeek(client.nextInvoiceDate)} — {formatWeekDate(client.nextInvoiceDate)}
                    </p>
                    <div className="mt-2">
                      <InvoiceBadge
                        status={
                          stats?.recurringStatus === "overdue"
                            ? "overdue"
                            : stats?.recurringStatus === "this_week"
                              ? "this_week"
                              : stats?.recurringStatus === "upcoming"
                                ? "upcoming"
                                : "ok"
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div className="bg-surface-2 border border-border-subtle rounded-xl p-5">
                  <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                    Contact
                  </h2>
                  <div className="space-y-3.5">
                    <InfoRow icon={Mail} label="E-mail" value={client.email} />
                    <InfoRow icon={Phone} label="Telefoon" value={client.phone} />
                    <InfoRow icon={MapPin} label="Adres" value={client.address} />
                    <InfoRow icon={Receipt} label="BTW nummer" value={client.vatNumber} />
                  </div>
                </div>
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
                    <InfoRow icon={Package} label="Pakket" value={client.packageType} />
                    {ct === "recurring" && (
                      <div className="flex items-start gap-3">
                        <Receipt size={15} className="text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-text-muted">Facturatiecyclus</p>
                          <p className="text-sm text-text-primary mt-0.5">
                            {formatCycle(client.billingCycle, client.customCycleDays)}
                          </p>
                        </div>
                      </div>
                    )}
                    {ct === "project" && (
                      <>
                        <InfoRow
                          icon={Receipt}
                          label="Projectbudget"
                          value={
                            client.projectBudget != null
                              ? `€${client.projectBudget.toLocaleString("nl-NL")}`
                              : undefined
                          }
                        />
                        <InfoRow
                          icon={CalendarDays}
                          label="Deadline"
                          value={formatDate(client.projectDeadline)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <ClientBillingSection client={client} />
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Content
                  <span className="ml-2 text-text-muted bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded-md font-normal normal-case tracking-normal">
                    {clientPosts.length} posts
                  </span>
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPost(null);
                    setPostFormOpen(true);
                  }}
                  className="h-7 text-xs gap-1.5"
                >
                  <Plus size={13} />
                  Post toevoegen
                </Button>
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
                  const mediaCount = post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0);
                  return (
                    <div
                      key={post.id}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="w-6 h-6 rounded bg-surface-3 border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={12} className="text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-md border ${postStatusColor[post.status]}`}
                          >
                            {postStatusLabel(post.status)}
                          </span>
                          <span className="text-xs text-text-muted">{postTypeLabel(post.type)}</span>
                          {post.date && (
                            <span className="text-xs text-text-muted">
                              · {format(parseISO(post.date), "d MMM yyyy", { locale: nl })}
                            </span>
                          )}
                        </div>
                        {post.caption && (
                          <p className="text-sm text-text-secondary line-clamp-2">{post.caption}</p>
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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => copyPreviewLink(post.id)}
                          className="p-1.5 rounded-md hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
                          title="Share preview"
                        >
                          {copiedPostId === post.id ? <Check size={13} /> : <Share2 size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(post);
                            setPostFormOpen(true);
                          }}
                          className="p-1.5 rounded-md hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
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
          </TabsContent>

          <TabsContent value="projects" className="mt-0">
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Projecten
                  {clientProjects.length > 0 && (
                    <span className="ml-2 text-text-muted bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded-md font-normal normal-case tracking-normal">
                      {clientProjects.length}
                    </span>
                  )}
                </h2>
                <Link
                  to="/projects"
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Alle projecten
                  <ArrowRight size={11} />
                </Link>
              </div>

              {projectsLoading && (
                <div className="px-4 py-8 text-center text-xs text-text-muted">Laden…</div>
              )}

              {!projectsLoading && clientProjects.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-text-muted">
                  Geen projecten gekoppeld aan deze klant.
                </div>
              )}

              {!projectsLoading && clientProjects.length > 0 && (
                <div className="divide-y divide-border-subtle">
                  {clientProjects.map((project) => {
                    const taskCount = projectTaskCounts[project.id] ?? 0
                    const statusConfig = {
                      active:    { label: 'Actief',     cls: 'text-green-400 bg-green-500/10 border-green-500/25' },
                      paused:    { label: 'Gepauzeerd', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
                      completed: { label: 'Afgerond',   cls: 'text-zinc-400  bg-zinc-500/10  border-zinc-500/25' },
                    }[project.status]
                    return (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: project.color ?? '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-text-muted truncate mt-0.5">{project.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-text-muted tabular-nums">
                            {taskCount} {taskCount === 1 ? 'taak' : 'taken'}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusConfig.cls}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ClientForm
          open={editing}
          onClose={() => setEditing(false)}
          onConfirmTypeChange={async (from: ClientType, to: ClientType) => {
            if (from === to) return true;
            if (from === "recurring" && (to === "project" || to === "oneoff")) {
              return window.confirm(
                "Je schakelt over van cyclus-facturatie naar project/eenmalig. Cyclus-gegevens worden niet meer gebruikt. Doorgaan?",
              );
            }
            if ((from === "project" || from === "oneoff") && to === "recurring") {
              return window.confirm(
                "Je schakelt over naar retainer/cyclus. Controleer facturatiecyclus en prijs in de volgende stap. Doorgaan?",
              );
            }
            return true;
          }}
          onSave={async (data) => {
            const { pendingInvoices, ...rest } = data;
            const patch = {
              ...rest,
              ...(rest.clientType !== "recurring" ? { invoiceRecords: [] as Client["invoiceRecords"] } : {}),
            };
            await updateClient(client.id, patch);
            if (pendingInvoices?.length) {
              const { addClientInvoice } = useStore.getState();
              for (const p of pendingInvoices) {
                await addClientInvoice({ ...p, clientId: client.id });
              }
            }
            toast.success("Klant bijgewerkt");
            setEditing(false);
          }}
          initial={client}
          title="Klant bewerken"
        />

        <PostForm
          open={postFormOpen}
          onClose={() => {
            setPostFormOpen(false);
            setEditingPost(null);
          }}
          onSave={async (data) => {
            if (editingPost) {
              await updatePost(editingPost.id, data);
              toast.success("Post opgeslagen");
            } else {
              const created = await addPost(data);
              toast.success("Post aangemaakt");
              setEditingPost(created);
            }
          }}
          onDelete={
            editingPost
              ? async () => {
                  await deletePost(editingPost.id);
                  toast.success("Post verwijderd");
                  setPostFormOpen(false);
                  setEditingPost(null);
                }
              : undefined
          }
          onDuplicate={async (data) => {
            await addPost(data);
            toast.success("Post gedupliceerd");
          }}
          initial={editingPost ?? undefined}
          clientId={client.id}
          clients={[client]}
          lockClient
          sharePostId={editingPost?.id}
          title={editingPost ? "Post bewerken" : "Post toevoegen"}
        />

        <Dialog open={confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Klant verwijderen?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-2">
              Weet je zeker dat je{" "}
              <strong className="text-foreground">{client.companyName}</strong> wilt verwijderen? Dit kan niet
              ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1">
                Annuleren
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="flex-1">
                Verwijderen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
