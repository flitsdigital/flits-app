import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isToday,
  getDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Image,
  Video,
  Film,
  Square,
  Layers,
  ExternalLink,
  Edit2,
  Trash2,
  Share2,
  Check,
  X,
  CalendarRange,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { PostForm } from "../components/PostForm";
import {
  postStatusDot,
  postStatusColor,
  postStatusChipColor,
  postTypeLabel,
  postStatusLabel,
  clientColor,
} from "../lib/postHelpers";
import type { Post, PostType } from "../types";

const TYPE_ICON: Record<PostType, React.ElementType> = {
  foto: Image,
  video: Video,
  reel: Film,
  story: Square,
  carousel: Layers,
};

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
type ViewMode = "month" | "week" | "list";

// ── Content Plan Modal ────────────────────────────────────────────────────────

const PLAN_DAYS = [
  { label: 'Ma', day: 1 }, { label: 'Di', day: 2 }, { label: 'Wo', day: 3 },
  { label: 'Do', day: 4 }, { label: 'Vr', day: 5 }, { label: 'Za', day: 6 },
  { label: 'Zo', day: 0 },
]

const PLAN_TYPES: PostType[] = ['foto', 'video', 'reel', 'story', 'carousel']

const TYPE_LABEL: Record<PostType, string> = {
  foto: 'Foto', video: 'Video', reel: 'Reel', story: 'Story', carousel: 'Carousel',
}

const TYPE_COLOR: Record<PostType, string> = {
  foto:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  video:    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  reel:     'bg-pink-500/15 text-pink-400 border-pink-500/30',
  story:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  carousel: 'bg-green-500/15 text-green-400 border-green-500/30',
}

const WEEK_PRESETS = [
  { label: '2 weken', weeks: 2 },
  { label: '4 weken', weeks: 4 },
  { label: '6 weken', weeks: 6 },
  { label: '8 weken', weeks: 8 },
  { label: '3 maanden', weeks: 13 },
]

function ContentPlanModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const { clients, addPostsBulk } = useStore()
  const today = new Date()

  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addWeeks(today, 6), 'yyyy-MM-dd'))
  const [selectedDays, setSelectedDays] = useState<number[]>([4]) // donderdag
  const [pattern, setPattern] = useState<PostType[]>(['foto', 'video'])
  const [loading, setLoading] = useState(false)

  function applyPreset(weeks: number) {
    setStartDate(format(today, 'yyyy-MM-dd'))
    setEndDate(format(addWeeks(today, weeks), 'yyyy-MM-dd'))
  }

  function toggleDay(day: number) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function addToPattern(type: PostType) {
    setPattern(prev => [...prev, type])
  }

  function removeFromPattern(index: number) {
    setPattern(prev => prev.filter((_, i) => i !== index))
  }

  // Compute preview: all dates in range on selected weekdays, cycling through pattern
  const preview = useMemo(() => {
    if (!startDate || !endDate || selectedDays.length === 0 || pattern.length === 0) return []
    try {
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      if (end < start) return []
      const allDays = eachDayOfInterval({ start, end })
      const matching = allDays.filter(d => selectedDays.includes(getDay(d)))
      return matching.map((date, i) => ({
        date: format(date, 'yyyy-MM-dd'),
        displayDate: format(date, 'EEE d MMM', { locale: nl }),
        type: pattern[i % pattern.length] as PostType,
      }))
    } catch { return [] }
  }, [startDate, endDate, selectedDays, pattern])

  async function handleGenerate() {
    if (!clientId || preview.length === 0) return
    setLoading(true)
    try {
      await addPostsBulk(
        preview.map(({ date, type }) => ({ clientId, type, status: 'todo' as const, caption: '', date }))
      )
      onGenerated()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = clientId && selectedDays.length > 0 && pattern.length > 0 && preview.length > 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <CalendarRange size={15} className="text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">Content plannen</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: settings */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 border-r border-border-subtle">

            {/* Client */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Klant</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
              >
                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Periode</label>
              <div className="flex gap-1.5 flex-wrap mb-2.5">
                {WEEK_PRESETS.map(p => (
                  <button
                    key={p.weeks}
                    onClick={() => applyPreset(p.weeks)}
                    className="px-2.5 py-1 text-xs border border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:border-zinc-600 transition-colors"
                  >
                    Komende {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                />
                <span className="text-text-muted text-sm">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>
            </div>

            {/* Days */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Dag(en) van de week</label>
              <div className="flex gap-1.5">
                {PLAN_DAYS.map(({ label, day }) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={clsx(
                      'w-9 h-9 rounded-lg text-xs font-medium border transition-colors',
                      selectedDays.includes(day)
                        ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                        : 'border-border-subtle text-text-muted hover:text-text-primary hover:border-zinc-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Patroon
                <span className="ml-1.5 font-normal text-text-muted">(herhaalt automatisch)</span>
              </label>

              {/* Current sequence */}
              {pattern.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3 p-2.5 bg-surface-0 rounded-lg border border-border-subtle min-h-[44px]">
                  {pattern.map((type, i) => (
                    <span key={i} className={clsx('flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium', TYPE_COLOR[type])}>
                      {TYPE_LABEL[type]}
                      <button onClick={() => removeFromPattern(i)} className="opacity-60 hover:opacity-100 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {pattern.length > 1 && (
                    <span className="text-xs text-text-muted ml-1">↺ herhaalt</span>
                  )}
                </div>
              )}

              {/* Add type buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {PLAN_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => addToPattern(type)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      TYPE_COLOR[type],
                      'hover:opacity-80'
                    )}
                  >
                    <Plus size={10} />
                    {TYPE_LABEL[type]}
                  </button>
                ))}
                {pattern.length > 0 && (
                  <button
                    onClick={() => setPattern([])}
                    className="px-2.5 py-1.5 rounded-lg border border-border-subtle text-xs text-text-muted hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    Wissen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-64 shrink-0 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Voorbeeld
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {preview.length === 0 ? 'Geen posts' : `${preview.length} posts`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {preview.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-text-muted">
                  Stel een periode, dag en patroon in
                </div>
              ) : (
                preview.map(({ date, displayDate, type }, i) => (
                  <div key={date + i} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-white/[0.02]">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                    <span className="text-xs text-text-muted w-20 shrink-0 capitalize">{displayDate}</span>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded border font-medium', TYPE_COLOR[type])}>
                      {TYPE_LABEL[type]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border-subtle flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {preview.length > 0
              ? `${preview.length} lege posts worden aangemaakt als "Te doen"`
              : 'Stel een patroon in om te beginnen'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-border-subtle text-text-secondary hover:text-text-primary text-sm rounded-lg transition-colors">
              Annuleren
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Genereren…</>
              ) : (
                <><CalendarRange size={14} />{preview.length > 0 ? `${preview.length} posts aanmaken` : 'Aanmaken'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Content() {
  const { posts, clients, addPost, updatePost, deletePost } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  const clientColorMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof clientColor>> = {};
    clients.forEach((c, i) => {
      map[c.id] = clientColor(i);
    });
    return map;
  }, [clients]);

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => {
      map[c.id] = c.companyName;
    });
    return map;
  }, [clients]);

  const filteredPosts = useMemo(
    () =>
      posts.filter(
        (p) => filterClientId === "all" || p.clientId === filterClientId,
      ),
    [posts, filterClientId],
  );

  function postsForDay(day: Date): Post[] {
    return filteredPosts
      .filter((p) => p.date && isSameDay(parseISO(p.date), day))
      .sort((a, b) => (a.clientId ?? "").localeCompare(b.clientId ?? ""));
  }

  // ── Month helpers ────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthStats = useMemo(() => {
    const mp = filteredPosts.filter((p) => {
      if (!p.date) return false;
      const d = parseISO(p.date);
      return isSameMonth(d, currentDate);
    });
    return {
      total: mp.length,
      posted: mp.filter((p) => p.status === "posted").length,
      feedback: mp.filter((p) => p.status === "feedback").length,
      in_progress: mp.filter((p) => p.status === "in_progress").length,
      todo: mp.filter((p) => p.status === "todo").length,
    };
  }, [filteredPosts, currentDate]);

  // ── Week helpers ─────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (isSameMonth(start, end)) {
      return `${format(start, "d")} – ${format(end, "d MMMM yyyy", { locale: nl })}`;
    }
    return `${format(start, "d MMM", { locale: nl })} – ${format(end, "d MMM yyyy", { locale: nl })}`;
  }, [weekDays]);

  const weekStats = useMemo(() => {
    const wp = filteredPosts.filter((p) => {
      if (!p.date) return false;
      const d = parseISO(p.date);
      return weekDays.some((day) => isSameDay(d, day));
    });
    return {
      total: wp.length,
      posted: wp.filter((p) => p.status === "posted").length,
      feedback: wp.filter((p) => p.status === "feedback").length,
      in_progress: wp.filter((p) => p.status === "in_progress").length,
      todo: wp.filter((p) => p.status === "todo").length,
    };
  }, [filteredPosts, weekDays]);

  // ── Navigation ───────────────────────────────────────────────────────────
  function prev() {
    setCurrentDate((d) =>
      viewMode === "month" ? subMonths(d, 1) : subWeeks(d, 1),
    );
    setSelectedDay(null);
  }
  function next() {
    setCurrentDate((d) =>
      viewMode === "month" ? addMonths(d, 1) : addWeeks(d, 1),
    );
    setSelectedDay(null);
  }

  const navLabel =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy", { locale: nl })
      : weekLabel;

  // ── Post form helpers ────────────────────────────────────────────────────
  function openNewPost(date?: Date) {
    setEditingPost(null);
    setDefaultDate(date ? format(date, "yyyy-MM-dd") : undefined);
    setPostFormOpen(true);
  }
  const formClientId =
    filterClientId !== "all" ? filterClientId : (clients[0]?.id ?? "");
  const stats = viewMode === "month" ? monthStats : weekStats;

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

  // ── Shared post chip (month) ─────────────────────────────────────────────
  function PostChip({ post }: { post: Post }) {
    const sc = postStatusChipColor[post.status] ?? postStatusChipColor['todo'];
    const Icon = TYPE_ICON[post.type];
    const clientName = clientMap[post.clientId] ?? "?";
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setEditingPost(post);
          setPostFormOpen(true);
        }}
        className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity border ${sc.bg} ${sc.text} ${sc.border}`}
      >
        <Icon size={10} className="shrink-0 opacity-70" />
        <span className="truncate font-medium">{clientName}</span>
      </div>
    );
  }

  // ── Full post card (week + day detail) ───────────────────────────────────
  function PostCard({
    post,
    compact = false,
  }: {
    post: Post;
    compact?: boolean;
  }) {
    const Icon = TYPE_ICON[post.type];
    const sc = postStatusChipColor[post.status] ?? postStatusChipColor['todo'];
    const clientName = clientMap[post.clientId] ?? "?";
    const primaryMediaUrl = post.mediaUrls?.[0] ?? post.mediaUrl;
    const mediaCount = post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0);
    return (
      <div
        className={`group flex gap-3 p-3 rounded-lg border bg-surface-3 hover:bg-surface-4 transition-colors ${sc.border}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${sc.bg} ${sc.border}`}
        >
          <Icon size={13} className={sc.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-xs font-semibold ${sc.text}`}
            >
              {clientName}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${postStatusColor[post.status]}`}
            >
              {postStatusLabel(post.status)}
            </span>
            <span className="text-xs text-text-muted">
              {postTypeLabel(post.type)}
            </span>
          </div>
          {post.caption && (
            <p
              className={`text-sm text-text-secondary ${compact ? "line-clamp-1" : "line-clamp-2"}`}
            >
              {post.caption}
            </p>
          )}
          {!compact && primaryMediaUrl && (
            <a
              href={primaryMediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1"
            >
              <ExternalLink size={11} />{" "}
              {post.type === "carousel" && mediaCount > 1
                ? `${mediaCount} afbeeldingen`
                : "Media"}
            </a>
          )}
        </div>
        <div className="flex gap-1 shrink-0 self-start mt-0.5">
          <button
            onClick={() => copyPreviewLink(post.id)}
            className="p-1.5 rounded-md bg-surface-4/30 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-colors"
          >
            {copiedPostId === post.id ? (
              <Check size={12} />
            ) : (
              <Share2 size={12} />
            )}
          </button>
          <button
            onClick={() => {
              setEditingPost(post);
              setPostFormOpen(true);
            }}
            className="p-1.5 rounded-md bg-surface-4/30 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => deletePost(post.id)}
            className="p-1.5 rounded-md bg-surface-4/30 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Content</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Content kalender — alle klanten
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
          >
            <option value="all">Alle klanten</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle rounded-lg p-1">
            {(["month", "week", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === v ? "bg-white/[0.08] text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
              >
                {v === "month" ? "Maand" : v === "week" ? "Week" : "Lijst"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPlanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border-subtle hover:border-zinc-600 text-text-secondary hover:text-text-primary text-sm font-medium rounded-lg transition-colors"
          >
            <CalendarRange size={14} />
            Content plannen
          </button>
          <button
            onClick={() => openNewPost()}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Post toevoegen
          </button>
        </div>
      </div>

      {/* Stats — alleen bij kalenderviews */}
      <div className={`flex items-center gap-4 mb-5 ${viewMode === "list" ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg">
          <span className="text-xs text-text-muted capitalize">{navLabel}</span>
          <span className="text-xs font-medium text-text-primary">
            {stats.total} posts
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-zinc-500" />
          <span className="text-xs text-text-muted">{stats.todo} te doen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-xs text-text-muted">{stats.in_progress} bezig</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-text-muted">{stats.feedback} voor feedback</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-text-muted">{stats.posted} gepost</span>
        </div>
      </div>

      {/* Kalender — alleen bij maand/week view */}
      {viewMode !== "list" && <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
        {/* Navigatie */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-semibold text-text-primary capitalize">
            {navLabel}
          </h2>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekdag headers */}
        <div className="grid grid-cols-7 border-b border-border-subtle">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-medium text-text-muted"
            >
              {d}
            </div>
          ))}
        </div>

        {/* ── MAAND VIEW ─────────────────────────────────────────────────── */}
        {viewMode === "month" && (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayPostList = postsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[108px] p-2 border-r border-b border-border-subtle/40 cursor-pointer transition-colors ${isSelected ? "bg-accent-blue/5 ring-1 ring-inset ring-accent-blue/20" : "hover:bg-white/[0.02]"} ${!inMonth ? "opacity-30" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-accent-blue text-white" : "text-text-secondary"}`}
                    >
                      {format(day, "d")}
                    </span>
                    {inMonth && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewPost(day);
                        }}
                        className="p-0.5 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayPostList.slice(0, 3).map((post) => (
                      <PostChip key={post.id} post={post} />
                    ))}
                    {dayPostList.length > 3 && (
                      <p className="text-xs text-text-muted pl-1">
                        +{dayPostList.length - 3} meer
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── WEEK VIEW ──────────────────────────────────────────────────── */}
        {viewMode === "week" && (
          <div className="divide-y divide-border-subtle/40">
            {weekDays.map((day, i) => {
              const dayPostList = postsForDay(day);
              const inCurrentMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={i}
                  className={`px-4 py-3 ${!inCurrentMonth ? "opacity-60" : ""}`}
                >
                  <div
                    className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${isToday(day) ? "bg-accent-blue/5" : "bg-surface-3/40"}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <p
                        className={`text-sm font-semibold capitalize ${isToday(day) ? "text-accent-blue" : "text-text-secondary"}`}
                      >
                        {format(day, "EEEE", { locale: nl })}
                      </p>
                      <p
                        className={`text-sm ${isToday(day) ? "text-accent-blue" : "text-text-muted"}`}
                      >
                        {format(day, "d MMMM", { locale: nl })}
                      </p>
                    </div>
                    <button
                      onClick={() => openNewPost(day)}
                      className="p-1 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {dayPostList.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openNewPost(day)}
                        className="w-full text-left rounded-lg border border-dashed border-border-subtle px-3 py-3 text-xs text-text-muted opacity-70 hover:opacity-100 hover:bg-surface-3/60 transition-colors"
                      >
                        Geen posts — klik om toe te voegen
                      </button>
                    ) : (
                      dayPostList.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* ── LIJST VIEW ──────────────────────────────────────────────────── */}
      {viewMode === "list" && (() => {
        const sorted = [...filteredPosts].sort((a, b) => {
          if (!a.date && !b.date) return 0
          if (!a.date) return 1
          if (!b.date) return -1
          return a.date.localeCompare(b.date)
        })

        const allIds = sorted.map(p => p.id)
        const allSelected = allIds.length > 0 && allIds.every(id => selectedPostIds.has(id))
        const someSelected = allIds.some(id => selectedPostIds.has(id)) && !allSelected

        function toggleAll() {
          if (allSelected) {
            setSelectedPostIds(new Set())
          } else {
            setSelectedPostIds(new Set(allIds))
          }
        }

        function toggleOne(id: string, e: React.MouseEvent) {
          e.stopPropagation()
          setSelectedPostIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
          })
        }

        // Groepeer op datum
        const groups: { label: string; date: string | null; posts: typeof sorted }[] = []
        for (const post of sorted) {
          const key = post.date ?? '__no_date__'
          const last = groups[groups.length - 1]
          if (last?.date === key) {
            last.posts.push(post)
          } else {
            groups.push({
              label: post.date ? format(parseISO(post.date), 'EEEE d MMMM yyyy', { locale: nl }) : 'Geen datum',
              date: key,
              posts: [post],
            })
          }
        }

        const COLS = "grid-cols-[20px_44px_1fr_160px_100px_140px]"

        return (
          <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">

            {/* Tabelheader */}
            <div className={`grid ${COLS} gap-3 items-center px-4 py-2.5 border-b border-border-subtle bg-surface-1/60 sticky top-0 z-10`}>
              {/* Checkbox alles */}
              <div onClick={toggleAll} className="flex items-center justify-center cursor-pointer">
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-accent-blue border-accent-blue' : someSelected ? 'bg-accent-blue/50 border-accent-blue' : 'border-zinc-600 hover:border-zinc-400'}`}>
                  {(allSelected || someSelected) && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
              <div />
              <span className="text-xs font-medium text-text-muted">Post</span>
              <span className="text-xs font-medium text-text-muted">Klant</span>
              <span className="text-xs font-medium text-text-muted">Type</span>
              <span className="text-xs font-medium text-text-muted">Status</span>
            </div>

            {sorted.length === 0 && (
              <div className="px-5 py-10 text-sm text-text-muted text-center">Geen posts gevonden.</div>
            )}

            {groups.map((group) => (
              <div key={group.date ?? 'none'}>
                {/* Datumkop */}
                <div className="px-4 py-2 bg-surface-1/20 border-b border-t border-border-subtle/40">
                  <span className={`text-xs font-semibold capitalize ${group.date && group.date !== '__no_date__' && isToday(parseISO(group.date)) ? 'text-accent-blue' : 'text-text-muted'}`}>
                    {group.label}
                    {group.date && group.date !== '__no_date__' && isToday(parseISO(group.date)) && <span className="ml-2 font-normal opacity-60">— vandaag</span>}
                  </span>
                </div>

                {/* Rijen */}
                {group.posts.map((post) => {
                  const sc = postStatusChipColor[post.status] ?? postStatusChipColor['todo']
                  const Icon = TYPE_ICON[post.type]
                  const clientName = clientMap[post.clientId] ?? '?'
                  const thumb = post.mediaUrls?.[0] ?? post.mediaUrl
                  const isSelected = selectedPostIds.has(post.id)
                  return (
                    <div
                      key={post.id}
                      onClick={() => { setEditingPost(post); setPostFormOpen(true) }}
                      className={`grid ${COLS} gap-3 items-center px-4 py-2.5 border-b border-border-subtle/30 cursor-pointer transition-colors group ${isSelected ? 'bg-accent-blue/[0.06]' : 'hover:bg-white/[0.025]'}`}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={(e) => toggleOne(post.id, e)}
                        className="flex items-center justify-center"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent-blue border-accent-blue' : 'border-zinc-600 opacity-0 group-hover:opacity-100 hover:border-zinc-400'}`}>
                          {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-3 border border-border-subtle shrink-0 flex items-center justify-center">
                        {thumb
                          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                          : <Icon size={13} className="text-text-muted" />
                        }
                      </div>

                      {/* Caption */}
                      <p className="text-sm text-text-primary truncate">
                        {post.caption || <span className="text-text-muted italic text-xs">Geen caption</span>}
                      </p>

                      {/* Klant */}
                      <span className={`text-xs font-medium truncate ${sc.text}`}>{clientName}</span>

                      {/* Type */}
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Icon size={12} className="shrink-0" />
                        {postTypeLabel(post.type)}
                      </div>

                      {/* Status */}
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border w-fit ${postStatusColor[post.status]}`}>
                        {postStatusLabel(post.status)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── FLOATING BULK ACTION BAR ─────────────────────────────────────── */}
      {selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/40">
          {/* Teller */}
          <span className="text-sm font-medium text-white pl-1">
            {selectedPostIds.size} geselecteerd
          </span>

          <div className="w-px h-4 bg-zinc-700" />

          {/* Status wijzigen */}
          <div className="relative">
            <button
              onClick={() => setBulkStatusOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              Status wijzigen
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {bulkStatusOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                {(['todo', 'in_progress', 'feedback', 'posted'] as const).map(s => (
                  <button
                    key={s}
                    onClick={async () => {
                      setBulkStatusOpen(false)
                      await Promise.all([...selectedPostIds].map(id => updatePost(id, { status: s })))
                      setSelectedPostIds(new Set())
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${postStatusDot[s]}`} />
                    {postStatusLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verwijderen */}
          <button
            onClick={async () => {
              if (!window.confirm(`${selectedPostIds.size} post${selectedPostIds.size !== 1 ? 's' : ''} verwijderen?`)) return
              await Promise.all([...selectedPostIds].map(id => deletePost(id)))
              setSelectedPostIds(new Set())
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Verwijderen
          </button>

          <div className="w-px h-4 bg-zinc-700" />

          {/* Sluiten */}
          <button
            onClick={() => setSelectedPostIds(new Set())}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dag detail panel (alleen maand view) */}
      {viewMode === "month" &&
        selectedDay &&
        (() => {
          const dayPosts = postsForDay(selectedDay);
          return (
            <div className="mt-4 bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
                <h3 className="text-sm font-medium text-text-primary capitalize">
                  {format(selectedDay, "EEEE d MMMM", { locale: nl })}
                  <span className="text-text-muted font-normal ml-2">
                    — {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""}
                  </span>
                </h3>
                <button
                  onClick={() => openNewPost(selectedDay)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-3 hover:bg-surface-4 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus size={12} /> Toevoegen
                </button>
              </div>
              {dayPosts.length === 0 ? (
                <div className="px-5 py-6 text-sm text-text-muted text-center">
                  Geen posts op deze dag.
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 gap-3">
                  {dayPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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
          } else {
            const created = await addPost(data);
            setEditingPost(created);
          }
        }}
        onDelete={editingPost ? async () => {
          await deletePost(editingPost.id);
          setPostFormOpen(false);
          setEditingPost(null);
        } : undefined}
        initial={
          editingPost ??
          (defaultDate ? ({ date: defaultDate } as Partial<Post>) : undefined)
        }
        clientId={editingPost?.clientId ?? formClientId}
        clients={clients}
        sharePostId={editingPost?.id}
        title={editingPost ? "Post bewerken" : "Post toevoegen"}
      />

      {/* Content plan modal */}
      {planModalOpen && (
        <ContentPlanModal
          onClose={() => setPlanModalOpen(false)}
          onGenerated={() => setPlanModalOpen(false)}
        />
      )}
    </div>
  );
}
