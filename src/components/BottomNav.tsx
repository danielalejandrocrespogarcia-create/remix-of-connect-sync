import { Home, MessageSquare, User, Calendar, ShieldCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const BottomNav = () => {
  const { pathname } = useLocation();
  const { role } = useAuth();

  const items = [
    { to: "/app", label: "Inicio", icon: Home, end: true },
    { to: "/app/horario", label: "Horario", icon: Calendar },
    { to: "/app/chat", label: "Chat", icon: MessageSquare },
    ...(role === "admin"
      ? [{ to: "/app/admin", label: "Admin", icon: ShieldCheck }]
      : role === "teacher"
        ? [{ to: "/app/docente", label: "Docente", icon: ShieldCheck }]
        : []),
    { to: "/app/perfil", label: "Perfil", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl shadow-[0_-2px_10px_hsl(220_30%_20%_/_0.05)]">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon, end }) => {
          const active = end ? pathname === to : pathname.startsWith(to);
          const isAdminItem = to === "/app/admin";
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all",
                active
                  ? isAdminItem ? "text-admin" : "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active && (isAdminItem ? "bg-admin/10" : "bg-accent/10")
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              </div>
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
