import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GanttChart,
  CalendarDays,
  Car,
  Settings,
  LogOut,
  Kanban,
  Zap,
  UserPlus,
  CheckSquare,
  Bell,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useUIStore } from "../store/useUIStore";
import { useTodosData } from "../hooks/useTodosData";
import { useNotifications } from "../hooks/useNotifications";
import type { AppPage } from "../types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ALL_NAV: {
  to: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  page: AppPage;
}[] = [
  { to: "/",           label: "Dashboard", icon: LayoutDashboard, exact: true,  page: "dashboard" },
  { to: "/clients",    label: "Klanten",   icon: Users,           exact: false, page: "clients"   },
  { to: "/timeline",   label: "Timeline",  icon: GanttChart,      exact: false, page: "timeline"  },
  { to: "/content",    label: "Content",   icon: CalendarDays,    exact: false, page: "content"   },
  { to: "/reiskosten", label: "Reiskosten",icon: Car,             exact: false, page: "reiskosten"},
  { to: "/projects",   label: "Projecten", icon: Kanban,          exact: false, page: "projects"  },
  { to: "/leads",      label: "Leads",     icon: UserPlus,        exact: false, page: "leads"     },
];

function NavItem({ to, label, icon: Icon, exact }: { to: string; label: string; icon: React.ElementType; exact: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2 px-2.5 py-[5px] rounded text-sm transition-colors duration-100",
          isActive
            ? "bg-white/[0.08] text-text-primary"
            : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]",
        )
      }
    >
      <Icon size={14} strokeWidth={1.8} className="shrink-0 opacity-70" />
      <span className="leading-none">{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const toggleTodo = useUIStore((s) => s.toggleTodo);
  const toggleInbox = useUIStore((s) => s.toggleInbox);
  const { openCount } = useTodosData();
  const { unreadCount } = useNotifications();

  const isAdmin = profile?.role === "admin";
  const nav = ALL_NAV.filter(
    ({ page }) => isAdmin || (profile?.allowed_pages ?? []).includes(page),
  );

  const initials = (profile?.name ?? profile?.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="w-[210px] shrink-0 flex flex-col bg-surface-1 border-r border-border-subtle h-screen sticky top-0 select-none">

      {/* Workspace header */}
      <div className="h-10 flex items-center px-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-5 h-5 rounded bg-yellow-500 flex items-center justify-center shrink-0">
            <Zap size={11} className="text-yellow-900 fill-yellow-900" />
          </div>
          <span className="text-sm font-semibold text-text-primary truncate leading-none">
            Flits Impact
          </span>
        </div>
      </div>
      <Separator className="bg-border-subtle" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-px scrollbar-none">
        {nav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Bottom: todo + inbox + settings + user */}
      <Separator className="bg-border-subtle" />
      <div className="px-2 py-2 space-y-px">
        {/* Todo + Inbox action row */}
        <div className="flex items-center gap-1 px-2.5 py-[5px]">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleTodo}
                  className="relative flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors flex-1"
                >
                  <CheckSquare size={14} strokeWidth={1.8} className="opacity-70 shrink-0" />
                  <span className="leading-none">Taken</span>
                  {openCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue leading-none">
                      {openCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Taken (T)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleInbox}
                  className="relative p-1 text-text-muted hover:text-text-secondary transition-colors rounded"
                >
                  <Bell size={14} strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Inbox</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isAdmin && (
          <NavItem to="/settings" label="Instellingen" icon={Settings} exact={false} />
        )}

        {/* User row */}
        <div className="flex items-center gap-2 px-2.5 py-[5px] mt-1">
          <Avatar className="w-5 h-5 text-2xs shrink-0">
            <AvatarFallback className="bg-surface-4 text-text-secondary border border-border-default text-2xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-text-secondary truncate flex-1 leading-none">
            {profile?.name ?? profile?.email ?? ""}
          </span>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="h-6 w-6 text-text-muted hover:text-text-secondary"
                >
                  <LogOut size={12} strokeWidth={1.8} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Uitloggen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </aside>
  );
}
