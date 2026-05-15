import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  FileText,
} from "lucide-react";
import { parseISO, format } from "date-fns";
import { nl } from 'date-fns/locale/nl'
import { useStore } from "../store/useStore";
import { copyPostPreviewLink } from "../lib/previewLink";
import { usePermissions } from "../hooks/usePermissions";
import { projectsDb } from "../lib/projectsDb";
import { formatDate, formatWeek, formatWeekDate, formatCycle } from "../lib/billing";
import { StatusBadge } from "../components/StatusBadge";
import { InvoiceBadge } from "../components/InvoiceBadge";
import { ClientForm } from "../components/ClientForm";
import { ClientTypeBadge } from "../components/ClientTypeBadge";
import { ClientBillingSection } from "../components/ClientBillingSection";
import { PostForm } from "../components/PostForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { PageSection } from "../components/PageSection";
import { ActionMenu } from "../components/ActionMenu";
import { EmptyState } from "../components/EmptyState";
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

// ── Info row ──────────────────────────────────────────────────────────────────
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
    <div className="flex items-start gap-3 py-2.5 border-b border-border-subtle/40 last:border-0">
      <Icon size={14} className="text-text-muted mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-disabled uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-text-primary mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded bg-surface-3 border border-border-subtle text-text-muted">
      {children}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const showFinancials = can("financials");
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
    if (!client) return;
    setProjectsLoading(true);
    projectsDb
      .fetchProjectsForClient(client.id)
      .then(async (projects) => {
        setClientProjects(projects);
        const counts: Record<string, number> = {};
        await Promise.all(
          projects.map(async (p) => {
            const tasks = await projectsDb.fetchProjectTasks(p.id);
            counts[p.id] = tasks.length;
          }),
        );
        setProjectTaskCounts(counts);
      })
      .catch(console.error)
      .finally(() => setProjectsLoading(false));
  }, [client?.id]);

  if (!client) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-text-muted text-sm">Klant niet gevonden.</p>
        <Link to="/clients" className="text-accent-blue text-sm mt-2 inline-block hover:underline">
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
    const ok = await copyPostPreviewLink(postId);
    if (ok) {
      setCopiedPostId(postId);
      window.setTimeout(
        () => setCopiedPostId((cur) => (cur === postId ? null : cur)),
        1800,
      );
    }
  }

  const ct = client.clientType ?? "recurring";

  const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
    active:    { label: "Actief",     cls: "text-green-400 bg-green-500/10 border-green-500/25" },
    paused:    { label: "Gepauzeerd", cls: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
    completed: { label: "Afgerond",   cls: "text-zinc-400  bg-zinc-500/10  border-zinc-500/25" },
  };

  return (
    <div>
      <PageHeader
        title={client.companyName}
        breadcrumbs={[
          { label: "Klanten", href: "/clients" },
          { label: client.companyName },
        ]}
      />

      <div className="px-4 lg:px-6 py-4 lg:py-5 max-w-5xl mx-auto space-y-5">

        {/* ── Hero header card ── */}
        <div className="rounded-xl border border-border-subtle bg-surface-card shadow-card p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left: avatar + info */}
            <div className="flex items-start gap-3.5 min-w-0">
              <InitialsAvatar name={client.companyName} size="lg" />
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-text-primary leading-tight">
                  {client.companyName}
                </h1>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <ClientTypeBadge type={client.clientType} />
                  <StatusBadge status={client.status} />
                  {client.packageType && (
                    <span className="text-xs text-text-muted">{client.packageType}</span>
                  )}
                </div>
                {stats && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {showFinancials && ct === "recurring" && client.status === "active" && client.nextInvoiceDate && (
                      <>
                        <StatPill>Volgende: {formatWeek(client.nextInvoiceDate)} {formatWeekDate(client.nextInvoiceDate)}</StatPill>
                        <StatPill>€{client.pricePerCycle.toLocaleString("nl-NL")} / cyclus</StatPill>
                      </>
                    )}
                    {showFinancials && ct === "project" && stats.progress && (
                      <>
                        <StatPill>Voortgang {stats.progress.pct}% ({stats.progress.paidCount}/{stats.progress.totalCount} termijnen)</StatPill>
                        <StatPill>Open €{stats.openAmount.toLocaleString("nl-NL")}</StatPill>
                      </>
                    )}
                    {showFinancials && ct === "oneoff" && stats.singleInvoice && (
                      <StatPill>
                        €{stats.singleInvoice.amount.toLocaleString("nl-NL")} — {formatDate(stats.singleInvoice.dueDate)} ({stats.singleInvoice.status})
                      </StatPill>
                    )}
                    <StatPill>{stats.postsThisWeek} posts deze week</StatPill>
                  </div>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 self-start shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-7 text-xs gap-1.5">
                <Edit2 size={12} />
                Bewerken
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                className="h-7 w-7 text-text-muted hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8 bg-surface-2 border border-border-subtle p-0.5 gap-0.5">
            <TabsTrigger value="overview" className="text-xs h-7 px-3">Overzicht</TabsTrigger>
            {showFinancials && (
              <TabsTrigger value="billing" className="text-xs h-7 px-3">Facturatie</TabsTrigger>
            )}
            <TabsTrigger value="content" className="text-xs h-7 px-3 gap-1.5">
              Content
              {clientPosts.length > 0 && (
                <span className="text-[10px] bg-surface-3 border border-border-default px-1.5 rounded text-text-muted font-normal">
                  {clientPosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs h-7 px-3 gap-1.5">
              <FolderKanban size={11} />
              Projecten
              {clientProjects.length > 0 && (
                <span className="text-[10px] bg-surface-3 border border-border-default px-1.5 rounded text-text-muted font-normal">
                  {clientProjects.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                <PageSection title="Notities" icon={FileText}>
                  <div className="px-4 py-3">
                    {client.notes ? (
                      <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                        {client.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-text-disabled italic">Geen notities.</p>
                    )}
                  </div>
                </PageSection>

                {showFinancials && ct === "recurring" && client.status === "active" && client.nextInvoiceDate && (
                  <PageSection title="Volgende factuur" icon={CalendarDays}>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-sm font-medium text-text-primary">
                        {formatWeek(client.nextInvoiceDate)} — {formatWeekDate(client.nextInvoiceDate)}
                      </p>
                      <InvoiceBadge
                        status={
                          stats?.recurringStatus === "overdue" ? "overdue" :
                          stats?.recurringStatus === "this_week" ? "this_week" :
                          stats?.recurringStatus === "upcoming" ? "upcoming" : "ok"
                        }
                      />
                    </div>
                  </PageSection>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <PageSection title="Contact" icon={Mail}>
                  <div className="px-4 py-1">
                    <InfoRow icon={Mail} label="E-mail" value={client.email} />
                    <InfoRow icon={Phone} label="Telefoon" value={client.phone} />
                    <InfoRow icon={MapPin} label="Adres" value={client.address} />
                    <InfoRow icon={Receipt} label="BTW nummer" value={client.vatNumber} />
                  </div>
                </PageSection>

                <PageSection title="Contract" icon={Receipt}>
                  <div className="px-4 py-1">
                    <InfoRow icon={CalendarDays} label="Startdatum" value={formatDate(client.startDate)} />
                    {client.endDate && (
                      <InfoRow icon={CalendarDays} label="Einddatum" value={formatDate(client.endDate)} />
                    )}
                    <InfoRow icon={Package} label="Pakket" value={client.packageType} />
                    {ct === "recurring" && (
                      <InfoRow
                        icon={Receipt}
                        label="Facturatiecyclus"
                        value={formatCycle(client.billingCycle, client.customCycleDays)}
                      />
                    )}
                    {showFinancials && ct === "project" && (
                      <>
                        <InfoRow
                          icon={Receipt}
                          label="Projectbudget"
                          value={client.projectBudget != null ? `€${client.projectBudget.toLocaleString("nl-NL")}` : undefined}
                        />
                        <InfoRow icon={CalendarDays} label="Deadline" value={formatDate(client.projectDeadline)} />
                      </>
                    )}
                  </div>
                </PageSection>
              </div>
            </div>
          </TabsContent>

          {/* ── Billing tab ── */}
          <TabsContent value="billing" className="mt-4">
            <ClientBillingSection client={client} />
          </TabsContent>

          {/* ── Content tab ── */}
          <TabsContent value="content" className="mt-4">
            <PageSection
              title="Content"
              count={clientPosts.length}
              icon={Image}
              action={
                <Button size="sm" onClick={() => { setEditingPost(null); setPostFormOpen(true); }} className="h-6 text-xs gap-1">
                  <Plus size={11} />
                  Toevoegen
                </Button>
              }
            >
              {clientPosts.length === 0 ? (
                <EmptyState
                  variant="inline"
                  icon={Image}
                  title="Nog geen posts"
                  description="Voeg de eerste post toe voor deze klant."
                  action={{ label: "Post toevoegen", onClick: () => { setEditingPost(null); setPostFormOpen(true); } }}
                />
              ) : (
                <div className="divide-y divide-border-subtle/60">
                  {clientPosts.map((post) => {
                    const Icon = TYPE_ICON[post.type];
                    const primaryMediaUrl = post.mediaUrls?.[0] ?? post.mediaUrl;
                    const mediaCount = post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0);
                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.025] transition-colors group"
                      >
                        <div className="w-6 h-6 rounded-md bg-surface-3 border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                          <Icon size={12} className="text-text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${postStatusColor[post.status]}`}>
                              {postStatusLabel(post.status)}
                            </span>
                            <span className="text-xs text-text-muted">{postTypeLabel(post.type)}</span>
                            {post.date && (
                              <span className="text-xs text-text-disabled">
                                {format(parseISO(post.date), "d MMM yyyy", { locale: nl })}
                              </span>
                            )}
                          </div>
                          {post.caption && (
                            <p className="text-sm text-text-secondary line-clamp-2 mt-0.5">{post.caption}</p>
                          )}
                          {primaryMediaUrl && (
                            <a
                              href={primaryMediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={10} />
                              {post.type === "carousel" && mediaCount > 1
                                ? `${mediaCount} afbeeldingen`
                                : "Media bekijken"}
                            </a>
                          )}
                        </div>

                        <ActionMenu
                          items={[
                            {
                              label: copiedPostId === post.id ? "Gekopieerd!" : "Preview link kopiëren",
                              icon: copiedPostId === post.id ? Check : Share2,
                              onClick: () => copyPreviewLink(post.id),
                            },
                            {
                              label: "Bewerken",
                              icon: Edit2,
                              onClick: () => { setEditingPost(post); setPostFormOpen(true); },
                            },
                            { separator: true, label: "", onClick: () => {} },
                            {
                              label: "Verwijderen",
                              icon: Trash2,
                              onClick: () => deletePost(post.id),
                              variant: "destructive",
                            },
                          ]}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </PageSection>
          </TabsContent>

          {/* ── Projects tab ── */}
          <TabsContent value="projects" className="mt-4">
            <PageSection
              title="Projecten"
              count={clientProjects.length || undefined}
              icon={FolderKanban}
              to="/projects"
            >
              {projectsLoading && (
                <div className="px-4 py-8 text-center text-xs text-text-muted">Laden…</div>
              )}

              {!projectsLoading && clientProjects.length === 0 && (
                <EmptyState
                  variant="inline"
                  icon={FolderKanban}
                  title="Geen projecten"
                  description="Er zijn geen projecten gekoppeld aan deze klant."
                />
              )}

              {!projectsLoading && clientProjects.length > 0 && (
                <div className="divide-y divide-border-subtle/60">
                  {clientProjects.map((project) => {
                    const taskCount = projectTaskCounts[project.id] ?? 0;
                    const sc = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.active;
                    return (
                      <div
                        key={project.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.025] transition-colors"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: project.color ?? "#3b82f6" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-text-muted truncate">{project.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-text-disabled tabular-nums">
                            {taskCount} {taskCount === 1 ? "taak" : "taken"}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PageSection>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Modals ── */}
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
        onClose={() => { setPostFormOpen(false); setEditingPost(null); }}
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

      <ConfirmDialog
        open={confirmDelete}
        title="Klant verwijderen?"
        itemName={client.companyName}
        destructive
        confirmLabel="Verwijderen"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
