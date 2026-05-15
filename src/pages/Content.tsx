import { useState, useMemo, useCallback, useEffect } from "react";
import { usePageMeta } from '../hooks/usePageMeta'
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
import { nl } from 'date-fns/locale/nl'
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  CalendarRange,
  LayoutGrid,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { copyPostPreviewLink } from "../lib/previewLink";
import { PostForm } from "../components/PostForm";
import { PageHeader } from "../components/PageHeader";
import { useIsMobile } from "../hooks/useBreakpoint";
import type { Post } from "../types";
import {
  ContentViewMode,
  normalizePostStatus,
} from "../components/content/contentConstants";
import { ContentKanbanBoard } from "../components/content/ContentKanban";
import { ContentPlanModal } from "../components/content/ContentPlanModal";
import { ClientFilterCombobox } from "../components/content/ContentClientFilter";
import { ContentPostChip, ContentPostCard } from "../components/content/ContentPostTiles";
import {
  ContentCalendarNav,
  ContentWeekdayHeaderRow,
  ContentMonthGrid,
  ContentWeekRows,
} from "../components/content/ContentCalendarGrids";
import { ContentListView } from "../components/content/ContentListView";
import { ContentBulkSelectionBar } from "../components/content/ContentBulkBar";
import { ContentDayDetailPanel } from "../components/content/ContentDayDetailPanel";


export function Content() {
  usePageMeta('Content → Flits Impact', 'Plan en beheer social media content voor al je klanten.')
  const { posts, clients, addPost, updatePost, deletePost } = useStore();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ContentViewMode>(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches
      ? 'list'
      : 'month'
  ));
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
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const [weekTodosOnly, setWeekTodosOnly] = useState(false);

  useEffect(() => {
    if (isMobile && viewMode === 'month') setViewMode('list');
  }, [isMobile, viewMode]);

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

  // ── Week helpers (needed before postsForCalendar) ─────────────────────────
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

  /** Kalender + week-view: optioneel alleen todo’s in de rondom `currentDate` geselecteerde week. */
  const postsForCalendar = useMemo(() => {
    if (!weekTodosOnly) return filteredPosts;
    return filteredPosts.filter((p) => {
      if (!p.date) return false;
      const d = parseISO(p.date);
      if (!weekDays.some((day) => isSameDay(d, day))) return false;
      return p.status === "todo" || (p.status as string) === "planned";
    });
  }, [filteredPosts, weekTodosOnly, weekDays]);

  /** Kanban: posts in dezelfde week; bij weekTodosOnly gelijk aan postsForCalendar. */
  const kanbanPosts = useMemo(() => {
    if (weekTodosOnly) return postsForCalendar;
    return filteredPosts.filter((p) => {
      if (!p.date) return false;
      const d = parseISO(p.date);
      return weekDays.some((day) => isSameDay(d, day));
    });
  }, [weekTodosOnly, postsForCalendar, filteredPosts, weekDays]);

  function postsForDay(day: Date): Post[] {
    return postsForCalendar
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
    const mp = postsForCalendar.filter((p) => {
      if (!p.date) return false;
      const d = parseISO(p.date);
      return isSameMonth(d, currentDate);
    });
    return {
      total: mp.length,
      posted: mp.filter((p) => normalizePostStatus(p.status) === "posted").length,
      feedback: mp.filter((p) => normalizePostStatus(p.status) === "feedback").length,
      in_progress: mp.filter((p) => normalizePostStatus(p.status) === "in_progress").length,
      todo: mp.filter((p) => normalizePostStatus(p.status) === "todo").length,
    };
  }, [postsForCalendar, currentDate]);

  const weekStats = useMemo(() => {
    const wp = postsForCalendar.filter((p) => {
      if (!p.date) return false;
      const d = parseISO(p.date);
      return weekDays.some((day) => isSameDay(d, day));
    });
    return {
      total: wp.length,
      posted: wp.filter((p) => normalizePostStatus(p.status) === "posted").length,
      feedback: wp.filter((p) => normalizePostStatus(p.status) === "feedback").length,
      in_progress: wp.filter((p) => normalizePostStatus(p.status) === "in_progress").length,
      todo: wp.filter((p) => normalizePostStatus(p.status) === "todo").length,
    };
  }, [postsForCalendar, weekDays]);

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
    filterClientId !== "all" ? filterClientId : "";
  const stats =
    viewMode === "month" ? monthStats : weekStats;

  async function copyPreviewLink(postId: string) {
    const ok = await copyPostPreviewLink(postId, { socialOg: true });
    if (ok) {
      setCopiedPostId(postId);
      window.setTimeout(
        () =>
          setCopiedPostId((current) => (current === postId ? null : current)),
        1800,
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Content kalender"
        actions={
          <>
            <ClientFilterCombobox value={filterClientId} onChange={setFilterClientId} clients={clients} />
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="week-todos-only"
                checked={weekTodosOnly}
                onCheckedChange={setWeekTodosOnly}
                className="scale-90"
              />
              <Label htmlFor="week-todos-only" className="text-xs text-text-muted whitespace-nowrap cursor-pointer">
                Alleen te doen deze week
              </Label>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ContentViewMode)}>
              <TabsList className="h-8 lg:h-7 p-0.5">
                <TabsTrigger value="month" className="text-xs h-7 lg:h-6 px-2.5 hidden lg:inline-flex">Maand</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-7 lg:h-6 px-2.5">Week</TabsTrigger>
                <TabsTrigger value="kanban" className="text-xs h-7 lg:h-6 px-2.5 gap-1">
                  <LayoutGrid size={12} className="opacity-70" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="text-xs h-7 lg:h-6 px-2.5">Lijst</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => setPlanModalOpen(true)} className="h-8 lg:h-7 text-xs gap-1.5">
              <CalendarRange size={12} />
              <span className="hidden sm:inline">Content plannen</span>
              <span className="sm:hidden">Plannen</span>
            </Button>
            <Button size="sm" onClick={() => openNewPost()} className="h-8 lg:h-7 text-xs gap-1.5">
              <Plus size={12} />
              <span className="hidden sm:inline">Post toevoegen</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </>
        }
      />
      <div className="px-4 lg:px-6 py-4 lg:py-5 max-w-full">

      {/* Stats — alleen bij kalenderviews */}
      <div className={`flex items-center gap-3 lg:gap-4 mb-4 lg:mb-5 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 ${viewMode === "list" ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg shrink-0 whitespace-nowrap">
          <span className="text-xs text-text-muted capitalize">{navLabel}</span>
          <span className="text-xs font-medium text-text-primary">
            {stats.total} posts
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-zinc-500" />
          <span className="text-xs text-text-muted">{stats.todo} te doen</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-xs text-text-muted">{stats.in_progress} bezig</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs text-text-muted">{stats.feedback} voor feedback</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-text-muted">{stats.posted} gepost</span>
        </div>
      </div>

      {/* Kalender — alleen bij maand/week view */}
      {viewMode !== "list" && viewMode !== "kanban" && (
        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <ContentCalendarNav navLabel={navLabel} onPrev={prev} onNext={next} />
          <ContentWeekdayHeaderRow />
          {viewMode === "month" && (
            <ContentMonthGrid
              calendarDays={calendarDays}
              currentDate={currentDate}
              selectedDay={selectedDay}
              draggingPostId={draggingPostId}
              dragOverDate={dragOverDate}
              postsForDay={postsForDay}
              onToggleDay={(day) => {
                setSelectedDay(selectedDay && isSameDay(selectedDay, day) ? null : day);
              }}
              onDropPostOnDate={(dateStr, postId) => {
                if (postId) void updatePost(postId, { date: dateStr });
                setDraggingPostId(null);
                setDragOverDate(null);
              }}
              onDragOverDate={setDragOverDate}
              onDragLeaveCell={(e, currentTarget) => {
                if (!currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverDate(null);
                }
              }}
              openNewPost={openNewPost}
              renderPostChip={(post) => (
                <ContentPostChip
                  post={post}
                  clientName={clientMap[post.clientId] ?? "?"}
                  isDragging={draggingPostId === post.id}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData("postId", post.id);
                    e.dataTransfer.effectAllowed = "move";
                    const id = post.id;
                    window.setTimeout(() => setDraggingPostId(id), 0);
                  }}
                  onDragEnd={() => {
                    setDraggingPostId(null);
                    setDragOverDate(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (draggingPostId !== post.id) {
                      setEditingPost(post);
                      setPostFormOpen(true);
                    }
                  }}
                />
              )}
            />
          )}
          {viewMode === "week" && (
            <ContentWeekRows
              weekDays={weekDays}
              currentDate={currentDate}
              postsForDay={postsForDay}
              openNewPost={openNewPost}
              renderPostCard={(post) => (
                <ContentPostCard
                  post={post}
                  clientName={clientMap[post.clientId] ?? "?"}
                  copiedPostId={copiedPostId}
                  onEdit={() => {
                    setEditingPost(post);
                    setPostFormOpen(true);
                  }}
                  onCopyPreview={() => void copyPreviewLink(post.id)}
                  onDelete={() => {
                    deletePost(post.id);
                    toast.success("Post verwijderd");
                  }}
                />
              )}
            />
          )}
        </div>
      )}

      {/* ── KANBAN (zelfde week als week-view) ───────────────────────────── */}
      {viewMode === "kanban" && (
        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <ContentCalendarNav navLabel={navLabel} onPrev={prev} onNext={next} />
          <div className="p-4">
            <ContentKanbanBoard
              posts={kanbanPosts}
              clientMap={clientMap}
              onPostClick={(post) => {
                setEditingPost(post);
                setPostFormOpen(true);
              }}
              onStatusChange={(id, status) => {
                void updatePost(id, { status });
              }}
            />
          </div>
        </div>
      )}

      {/* ── LIJST VIEW ──────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <ContentListView
          weekTodosOnly={weekTodosOnly}
          postsForCalendar={postsForCalendar}
          filteredPosts={filteredPosts}
          selectedPostIds={selectedPostIds}
          setSelectedPostIds={setSelectedPostIds}
          clientMap={clientMap}
          onOpenPost={(post) => {
            setEditingPost(post);
            setPostFormOpen(true);
          }}
        />
      )}

      <ContentBulkSelectionBar
        count={selectedPostIds.size}
        bulkStatusOpen={bulkStatusOpen}
        onToggleBulkStatusOpen={() => setBulkStatusOpen((v) => !v)}
        onBulkSetStatus={async (s) => {
          setBulkStatusOpen(false);
          await Promise.all([...selectedPostIds].map((id) => updatePost(id, { status: s })));
          setSelectedPostIds(new Set());
        }}
        onBulkDelete={async () => {
          const aantal = selectedPostIds.size;
          if (!window.confirm(`${aantal} ${aantal === 1 ? "post" : "posts"} definitief verwijderen?`)) return;
          await Promise.all([...selectedPostIds].map((id) => deletePost(id)));
          setSelectedPostIds(new Set());
        }}
        onClearSelection={() => setSelectedPostIds(new Set())}
      />

      {viewMode === "month" && selectedDay && (
        <ContentDayDetailPanel
          selectedDay={selectedDay}
          dayPosts={postsForDay(selectedDay)}
          clientMap={clientMap}
          copiedPostId={copiedPostId}
          onAddPost={openNewPost}
          onEditPost={(post) => {
            setEditingPost(post);
            setPostFormOpen(true);
          }}
          onCopyPreview={(id) => void copyPreviewLink(id)}
          onDeletePost={(post) => {
            deletePost(post.id);
            toast.success("Post verwijderd");
          }}
        />
      )}

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

      {/* Content plan modal */}
      {planModalOpen && (
        <ContentPlanModal
          onClose={() => setPlanModalOpen(false)}
          onGenerated={() => setPlanModalOpen(false)}
        />
      )}
      </div>
    </div>
  );
}
