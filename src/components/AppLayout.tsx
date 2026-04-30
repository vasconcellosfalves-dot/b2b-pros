import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Mail,
  Settings,
  LogOut,
  MessageSquare,
  FileText,
  MoreHorizontal,
  User as UserIcon,
} from "lucide-react";
import { B2BLogo } from "./B2BLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/kanban", label: "Kanban", icon: Kanban },
  { to: "/emails", label: "Campanhas", icon: Mail },
  { to: "/respostas", label: "Respostas", icon: MessageSquare, badge: "respostas" as const },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const mobilePrimary = navItems.slice(0, 5);
const mobileMore = navItems.slice(5);

export default function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      supabase
        .from("respostas")
        .select("id", { count: "exact", head: true })
        .eq("status", "nova")
        .then(({ count }) => setUnread(count ?? 0));
    };

    refresh();

    const channel = supabase
      .channel("respostas-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "respostas" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="p-5 border-b border-sidebar-border">
          <B2BLogo size="md" showTagline />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge === "respostas" && unread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#EF4444] px-1 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <p className="px-3 text-xs text-muted-foreground truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar with logged user */}
        <header className="hidden md:flex items-center justify-end border-b border-border bg-card/40 px-6 py-2.5">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-foreground max-w-[220px] truncate">
              {user?.email ?? "Usuário"}
            </span>
          </div>
        </header>

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b border-border bg-card/50 px-4 py-3">
          <B2BLogo size="sm" showTagline />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground max-w-[140px] truncate">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="grid grid-cols-6">
            {mobilePrimary.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-full px-1">{item.label}</span>
                {item.badge === "respostas" && unread > 0 && (
                  <span className="absolute top-1 right-2 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[#EF4444] px-1 text-[11px] font-bold text-white leading-none">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </NavLink>
            ))}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground">
                  <MoreHorizontal className="h-5 w-5" />
                  <span>Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Mais</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2 mt-4">
                  {mobileMore.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-secondary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </div>
  );
}
