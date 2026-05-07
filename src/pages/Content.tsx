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
} from "date-fns";
import { nl } from "date-fns/locale";
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
} from "lucide-react";
import { useStore } from "../store/useStore";
import { PostForm } from "../components/PostForm";
import {
  postStatusDot,
  postStatusColor,
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
type ViewMode = "month" | "week";

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
      planned: mp.filter((p) => p.status === "planned").length,
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
      planned: wp.filter((p) => p.status === "planned").length,
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
    const color = clientColorMap[post.clientId];
    const Icon = TYPE_ICON[post.type];
    const clientName = clientMap[post.clientId] ?? "?";
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setEditingPost(post);
          setPostFormOpen(true);
        }}
        className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity border ${color?.bg ?? "bg-surface-3"} ${color?.text ?? "text-text-secondary"} ${color?.border ?? "border-border-subtle"}`}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${postStatusDot[post.status]}`}
        />
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
    const color = clientColorMap[post.clientId];
    const clientName = clientMap[post.clientId] ?? "?";
    const primaryMediaUrl = post.mediaUrls?.[0] ?? post.mediaUrl;
    const mediaCount = post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0);
    return (
      <div
        className={`group flex gap-3 p-3 rounded-lg border bg-surface-3 hover:bg-surface-4 transition-colors ${color?.border ?? "border-border-subtle"}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${color?.bg ?? "bg-surface-4"} ${color?.border ?? "border-border-subtle"}`}
        >
          <Icon size={13} className={color?.text ?? "text-text-muted"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-xs font-semibold ${color?.text ?? "text-text-secondary"}`}
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
            {(["month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === v ? "bg-white/[0.08] text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
              >
                {v === "month" ? "Maand" : "Week"}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNewPost()}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} />
            Post toevoegen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg">
          <span className="text-xs text-text-muted capitalize">{navLabel}</span>
          <span className="text-xs font-medium text-text-primary">
            {stats.total} posts
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-text-muted">{stats.posted} gepost</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-text-muted">
            {stats.planned} gepland
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-zinc-500" />
          <span className="text-xs text-text-muted">{stats.todo} te doen</span>
        </div>
      </div>

      {/* Kalender */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
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
      </div>

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
        onSave={(data) => {
          if (editingPost) updatePost(editingPost.id, data);
          else addPost(data);
        }}
        initial={
          editingPost ??
          (defaultDate ? ({ date: defaultDate } as Partial<Post>) : undefined)
        }
        clientId={editingPost?.clientId ?? formClientId}
        clients={clients}
        sharePostId={editingPost?.id}
        title={editingPost ? "Post bewerken" : "Post toevoegen"}
      />
    </div>
  );
}
