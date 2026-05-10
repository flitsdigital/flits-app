import { useState, useMemo, useCallback } from "react";
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
  getDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerButton } from "@/components/ui/date-picker-button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  ChevronsUpDown,
  MoreHorizontal,
  LayoutGrid,
  Circle,
  CircleDot,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { PostForm } from "../components/PostForm";
import { PageHeader } from "../components/PageHeader";
import {
  postStatusDot,
  postStatusColor,
  postStatusChipColor,
  postTypeLabel,
  postStatusLabel,
} from "../lib/postHelpers";
import type { Post, PostType, PostStatus } from "../types";

const TYPE_ICON: Record<PostType, React.ElementType> = {
  foto: Image,
  video: Video,
  reel: Film,
  story: Square,
  carousel: Layers,
};

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
type ViewMode = "month" | "week" | "list" | "kanban";

/** DB kan nog `planned` hebben — behandel als todo. */
function normalizePostStatus(status: string): PostStatus {
  if (status === "planned") return "todo";
  return status as PostStatus;
}

const POST_KANBAN_COLS: {
  id: PostStatus;
  label: string;
  Icon: React.ElementType;
  bg: string;
  headerBg: string;
  ring: string;
  text: string;
}[] = [
  { id: "todo", label: "Te doen", Icon: Circle, bg: "bg-zinc-500/[0.06]", headerBg: "bg-zinc-500/10", ring: "bg-zinc-400", text: "text-zinc-400" },
  { id: "in_progress", label: "Bezig", Icon: CircleDot, bg: "bg-orange-500/[0.06]", headerBg: "bg-orange-500/10", ring: "bg-orange-400", text: "text-orange-400" },
  { id: "feedback", label: "Feedback", Icon: MessageSquare, bg: "bg-blue-500/[0.06]", headerBg: "bg-blue-500/10", ring: "bg-blue-400", text: "text-blue-400" },
  { id: "posted", label: "Gepost", Icon: CheckCircle2, bg: "bg-green-500/[0.05]", headerBg: "bg-green-500/10", ring: "bg-green-400", text: "text-green-400" },
];

function PostKanbanCard({
  post,
  clientName,
  onClick,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  post: Post;
  clientName: string;
  onClick: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const Icon = TYPE_ICON[post.type];
  const st = normalizePostStatus(post.status);
  const sc = postStatusChipColor[st] ?? postStatusChipColor.todo;
  const bar: Record<PostStatus, string> = {
    todo: "border-l-zinc-500",
    in_progress: "border-l-orange-500",
    feedback: "border-l-blue-500",
    posted: "border-l-green-500",
  };
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        "bg-surface-0 border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-zinc-500 hover:shadow-lg hover:shadow-black/20 transition-all group select-none border-l-[3px]",
        bar[st],
        sc.border,
        isDragging && "opacity-40 scale-[0.98]",
      )}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-border-subtle bg-surface-2">
          <Icon size={13} className="text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary leading-snug group-hover:text-white transition-colors truncate">
            {clientName}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">{postTypeLabel(post.type)}</p>
        </div>
      </div>
      {post.caption && (
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{post.caption}</p>
      )}
      {post.date && (
        <p className="text-[10px] text-text-muted mt-1.5">
          {format(parseISO(post.date), "EEE d MMM", { locale: nl })}
        </p>
      )}
    </div>
  );
}

function ContentKanbanBoard({
  posts,
  clientMap,
  onPostClick,
  onStatusChange,
}: {
  posts: Post[];
  clientMap: Record<string, string>;
  onPostClick: (post: Post) => void;
  onStatusChange: (postId: string, status: PostStatus) => void | Promise<void>;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<PostStatus | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<PostStatus, Post[]> = { todo: [], in_progress: [], feedback: [], posted: [] };
    for (const p of posts) {
      const st = normalizePostStatus(p.status);
      (map[st] ?? map.todo).push(p);
    }
    (Object.keys(map) as PostStatus[]).forEach((k) => {
      map[k].sort((a, b) => {
        const da = a.date ?? "";
        const db = b.date ?? "";
        if (da !== db) return da.localeCompare(db);
        return (clientMap[a.clientId] ?? "").localeCompare(clientMap[b.clientId] ?? "");
      });
    });
    return map;
  }, [posts, clientMap]);

  const handleDragOver = useCallback((e: React.DragEvent, status: PostStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, status: PostStatus) => {
      e.preventDefault();
      if (draggedId) {
        const post = posts.find((p) => p.id === draggedId);
        if (post && normalizePostStatus(post.status) !== status) {
          void onStatusChange(draggedId, status);
        }
      }
      setDraggedId(null);
      setDragOverStatus(null);
    },
    [draggedId, posts, onStatusChange],
  );

  return (
    <div className="flex gap-3 h-full min-h-[420px] overflow-x-auto pb-4">
      {POST_KANBAN_COLS.map(({ id, label, Icon, bg, headerBg, ring, text }) => {
        const colPosts = byStatus[id];
        const isOver = dragOverStatus === id;
        const isDragSource = draggedId !== null && colPosts.some((p) => p.id === draggedId);
        return (
          <div
            key={id}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, id)}
            className={clsx(
              "flex flex-col w-[272px] shrink-0 rounded-xl overflow-hidden border transition-all duration-150",
              bg,
              isOver
                ? "border-accent-blue/60 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                : isDragSource
                  ? "border-zinc-700"
                  : "border-border-subtle",
            )}
          >
            <div className={clsx("flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle", headerBg)}>
              <div className={clsx("w-2 h-2 rounded-full shrink-0", ring)} />
              <Icon size={13} className={text} />
              <span className={clsx("text-xs font-semibold uppercase tracking-wider", text)}>{label}</span>
              <span
                className={clsx(
                  "ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full",
                  colPosts.length > 0 ? `${text} bg-white/[0.08]` : "text-text-muted",
                )}
              >
                {colPosts.length}
              </span>
            </div>

            <div
              className={clsx(
                "flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150 min-h-[120px]",
                isOver && colPosts.length === 0 && "bg-accent-blue/[0.06]",
              )}
            >
              {colPosts.map((post) => (
                <PostKanbanCard
                  key={post.id}
                  post={post}
                  clientName={clientMap[post.clientId] ?? "?"}
                  onClick={() => {
                    if (!draggedId) onPostClick(post);
                  }}
                  isDragging={draggedId === post.id}
                  onDragStart={() => setDraggedId(post.id)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverStatus(null);
                  }}
                />
              ))}

              {isOver && draggedId && !colPosts.some((p) => p.id === draggedId) && (
                <div className="border-2 border-dashed border-accent-blue/40 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-accent-blue/60">Hier neerzetten</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

function ClientComboboxContent({ value, onChange, clients }: { value: string; onChange: (v: string) => void; clients: { id: string; companyName: string }[] }) {
  const [open, setOpen] = useState(false)
  const selected = clients.find(c => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm">
          {selected ? selected.companyName : <span className="text-muted-foreground">Selecteer klant...</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klant gevonden.</CommandEmpty>
            <CommandGroup>
              {clients.map(c => (
                <CommandItem key={c.id} value={c.companyName} onSelect={() => { onChange(c.id); setOpen(false) }}>
                  <Check size={14} className={cn('mr-2', value === c.id ? 'opacity-100' : 'opacity-0')} />
                  {c.companyName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ContentDatePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <DatePickerButton
      value={value || undefined}
      onChange={onChange}
      placeholder={placeholder}
      className="flex-1 rounded-md justify-start"
    />
  )
}

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
      toast.success(`${preview.length} posts ingepland`)
      onGenerated()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = clientId && selectedDays.length > 0 && pattern.length > 0 && preview.length > 0

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-row items-center gap-2 px-5 py-4 border-b border-border-subtle space-y-0">
          <CalendarRange size={15} className="text-accent-blue" />
          <DialogTitle className="text-sm font-semibold">Content plannen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: settings */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 border-r border-border-subtle">

            {/* Client */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Klant</label>
              <ClientComboboxContent value={clientId} onChange={setClientId} clients={clients} />
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
                <ContentDatePicker value={startDate} onChange={setStartDate} placeholder="Startdatum" />
                <span className="text-text-muted text-sm shrink-0">→</span>
                <ContentDatePicker value={endDate} onChange={setEndDate} placeholder="Einddatum" />
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
            <Button variant="outline" onClick={onClose}>Annuleren</Button>
            <Button onClick={handleGenerate} disabled={!canGenerate || loading} className="gap-2">
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Genereren…</>
              ) : (
                <><CalendarRange size={14} />{preview.length > 0 ? `${preview.length} posts aanmaken` : 'Aanmaken'}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ClientFilterCombobox({ value, onChange, clients }: { value: string; onChange: (v: string) => void; clients: { id: string; companyName: string }[] }) {
  const [open, setOpen] = useState(false)
  const selected = clients.find(c => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-7 text-xs justify-between font-normal min-w-[140px]">
          {selected ? selected.companyName : 'Alle klanten'}
          <ChevronsUpDown size={12} className="text-muted-foreground shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." className="h-8" />
          <CommandList>
            <CommandEmpty>Niet gevonden.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => { onChange('all'); setOpen(false) }}>
                <Check size={12} className={cn('mr-2', value === 'all' ? 'opacity-100' : 'opacity-0')} />
                Alle klanten
              </CommandItem>
              {clients.map(c => (
                <CommandItem key={c.id} value={c.companyName} onSelect={() => { onChange(c.id); setOpen(false) }}>
                  <Check size={12} className={cn('mr-2', value === c.id ? 'opacity-100' : 'opacity-0')} />
                  {c.companyName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function Content() {
  usePageMeta('Content → Flits Impact', 'Plan en beheer social media content voor al je klanten.')
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
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const [weekTodosOnly, setWeekTodosOnly] = useState(false);

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
    filterClientId !== "all" ? filterClientId : (clients[0]?.id ?? "");
  const stats =
    viewMode === "month" ? monthStats : weekStats;

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
    const st = normalizePostStatus(post.status);
    const sc = postStatusChipColor[st] ?? postStatusChipColor.todo;
    const Icon = TYPE_ICON[post.type];
    const clientName = clientMap[post.clientId] ?? "?";
    const isDragging = draggingPostId === post.id;
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('postId', post.id);
          e.dataTransfer.effectAllowed = 'move';
          // Defer zodat de browser de drag initialiseert vóór de re-render
          const id = post.id;
          window.setTimeout(() => setDraggingPostId(id), 0);
        }}
        onDragEnd={() => {
          setDraggingPostId(null);
          setDragOverDate(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) {
            setEditingPost(post);
            setPostFormOpen(true);
          }
        }}
        className={`flex items-start gap-2 px-2 py-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing bg-surface-1/90 ${sc.border} ${isDragging ? 'opacity-30 scale-[0.98]' : 'hover:bg-surface-1 hover:border-border-default'}`}
      >
        <span className={`mt-[3px] w-1.5 h-1.5 rounded-full shrink-0 ${postStatusDot[st]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon size={10} className="shrink-0 text-text-muted" />
            <span className="truncate font-medium text-text-primary text-[11px]">{clientName}</span>
          </div>
          {post.caption && (
            <p className="truncate text-[10px] text-text-muted mt-0.5">{post.caption}</p>
          )}
        </div>
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
    const st = normalizePostStatus(post.status);
    const sc = postStatusChipColor[st] ?? postStatusChipColor.todo;
    const clientName = clientMap[post.clientId] ?? "?";
    const primaryMediaUrl = post.mediaUrls?.[0] ?? post.mediaUrl;
    const mediaCount = post.mediaUrls?.length ?? (post.mediaUrl ? 1 : 0);
    const statusBar: Record<PostStatus, string> = {
      todo: 'border-l-zinc-500',
      in_progress: 'border-l-orange-500',
      feedback: 'border-l-blue-500',
      posted: 'border-l-green-500',
    }
    return (
      <div
        className={`group flex gap-3 p-3 rounded-lg border bg-surface-0 hover:bg-surface-1 transition-all border-l-[3px] ${statusBar[st]} ${sc.border}`}
      >
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-border-subtle bg-surface-2">
          <Icon size={13} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-text-primary">
              {clientName}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${postStatusColor[st]}`}
            >
              {postStatusLabel(st)}
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
              className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1.5"
            >
              <ExternalLink size={11} />{" "}
              {post.type === "carousel" && mediaCount > 1
                ? `${mediaCount} afbeeldingen`
                : "Media"}
            </a>
          )}
        </div>
        <div className="shrink-0 self-start mt-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted opacity-0 group-hover:opacity-100">
                <MoreHorizontal size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => { setEditingPost(post); setPostFormOpen(true) }}>
                <Edit2 size={12} className="mr-2" /> Bewerken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyPreviewLink(post.id)}>
                {copiedPostId === post.id ? <Check size={12} className="mr-2" /> : <Share2 size={12} className="mr-2" />}
                {copiedPostId === post.id ? 'Gekopieerd!' : 'Preview link'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { deletePost(post.id); toast.success('Post verwijderd') }}>
                <Trash2 size={12} className="mr-2" /> Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
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
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="month" className="text-xs h-6 px-2.5">Maand</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-6 px-2.5">Week</TabsTrigger>
                <TabsTrigger value="kanban" className="text-xs h-6 px-2.5 gap-1">
                  <LayoutGrid size={12} className="opacity-70" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="text-xs h-6 px-2.5">Lijst</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => setPlanModalOpen(true)} className="h-7 text-xs gap-1.5">
              <CalendarRange size={12} /> Content plannen
            </Button>
            <Button size="sm" onClick={() => openNewPost()} className="h-7 text-xs gap-1.5">
              <Plus size={12} /> Post toevoegen
            </Button>
          </>
        }
      />
      <div className="px-6 py-5 max-w-full">

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
      {viewMode !== "list" && viewMode !== "kanban" && <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
        {/* Navigatie */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
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
              const dateStr = format(day, 'yyyy-MM-dd');
              const isDragTarget = draggingPostId && dragOverDate === dateStr;
              return (
                <div
                  key={i}
                  onClick={() => !draggingPostId && setSelectedDay(isSelected ? null : day)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverDate(dateStr);
                  }}
                  onDragLeave={(e) => {
                    // Alleen clearen als we echt de cel verlaten (niet naar een kind-element)
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverDate(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const postId = e.dataTransfer.getData('postId') || draggingPostId;
                    if (postId) {
                      updatePost(postId, { date: dateStr });
                    }
                    setDraggingPostId(null);
                    setDragOverDate(null);
                  }}
                  className={`min-h-[108px] p-2 border-r border-b border-border-subtle/40 transition-colors
                    ${isDragTarget ? 'bg-accent-blue/10 ring-1 ring-inset ring-accent-blue/40' : ''}
                    ${isSelected && !draggingPostId ? 'bg-accent-blue/5 ring-1 ring-inset ring-accent-blue/20' : ''}
                    ${!isDragTarget && !isSelected ? 'hover:bg-white/[0.02]' : ''}
                    ${!inMonth ? 'opacity-30' : ''}
                    ${draggingPostId ? 'cursor-copy' : 'cursor-pointer'}
                  `}
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

      {/* ── KANBAN (zelfde week als week-view) ───────────────────────────── */}
      {viewMode === "kanban" && (
        <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
            <button
              type="button"
              onClick={prev}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold text-text-primary capitalize">
              {navLabel}
            </h2>
            <button
              type="button"
              onClick={next}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
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
      {viewMode === "list" && (() => {
        const listSource = weekTodosOnly ? postsForCalendar : filteredPosts;
        const sorted = [...listSource].sort((a, b) => {
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
              <div className="px-4 py-10 text-xs text-text-muted text-center">Geen posts gevonden.</div>
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
                  const st = normalizePostStatus(post.status);
                  const sc = postStatusChipColor[st] ?? postStatusChipColor.todo;
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
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border w-fit ${postStatusColor[st]}`}>
                        {postStatusLabel(st)}
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
              const aantal = selectedPostIds.size
              if (!window.confirm(`${aantal} ${aantal === 1 ? 'post' : 'posts'} definitief verwijderen?`)) return
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
            <div className="mt-4 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                <h3 className="text-sm font-medium text-text-primary capitalize">
                  {format(selectedDay, "EEEE d MMMM", { locale: nl })}
                  <span className="text-text-muted font-normal ml-2">
                    — {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""}
                  </span>
                </h3>
                <button
                  onClick={() => openNewPost(selectedDay)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-3 hover:bg-surface-4 border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-medium rounded transition-colors"
                >
                  <Plus size={12} /> Toevoegen
                </button>
              </div>
              {dayPosts.length === 0 ? (
                <div className="px-4 py-6 text-xs text-text-muted text-center">
                  Geen posts op deze dag.
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
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
