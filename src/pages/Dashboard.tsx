import { useAuth } from "@/hooks/useAuth";
import { UPTLogo } from "@/components/UPTLogo";
import { useActiveClass } from "@/hooks/useActiveClass";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useSchedule, formatTime, DAYS_FULL_ES } from "@/hooks/useSchedule";
import { SectionSwitcher } from "@/components/SectionSwitcher";
import {
  Bell, MapPin, Clock, BookOpen, Users, AlertTriangle,
  ShieldCheck, ChevronRight, Calendar, Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const { profile, role, activeSection } = useAuth();
  const { data: activeClass } = useActiveClass(activeSection);
  const { items: announcements } = useAnnouncements(activeSection, 5);
  const { items: schedule } = useSchedule(activeSection);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = (now.getDay() + 6) % 7 + 1; // 1..7 Mon..Sun
  const nowHM = now.toTimeString().slice(0, 5);

  const todaysClasses = useMemo(() =>
    schedule.filter(s => s.day_of_week === today).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [schedule, today]
  );

  const nextClass = useMemo(
    () => todaysClasses.find(s => s.start_time.slice(0, 5) >= nowHM) ?? todaysClasses[0],
    [todaysClasses, nowHM]
  );

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }, [now]);

  const subjectsCount = role === "teacher" ? (profile?.subjects?.length ?? 0) : new Set(schedule.map(s => s.subject)).size || 6;
  const sectionsCount = (role === "teacher" || role === "admin") ? (profile?.sections?.length ?? 1) : null;

  return (
    <div className="px-4 pt-5 pb-2">
      {/* Greeting + logo */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl font-bold truncate">
            {profile?.full_name?.split(" ")[0] ?? "Usuario"}
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            {role === "admin" && <Badge tone="admin" icon={<ShieldCheck className="h-3 w-3" />}>ADMIN</Badge>}
            {role === "teacher" && <Badge tone="accent" icon={<ShieldCheck className="h-3 w-3" />}>PROFESOR</Badge>}
            {role === "student" && (
              <p className="text-xs text-muted-foreground truncate">
                {profile?.trayecto ?? "Estudiante"} · Sección {profile?.seccion ?? "—"}
              </p>
            )}
            {(role === "teacher" || role === "admin") && (
              <span className="text-[11px] text-muted-foreground truncate">· {activeSection}</span>
            )}
          </div>
        </div>
        <UPTLogo size={52} glow={false} />
      </header>

      {(role === "teacher" || role === "admin") && (profile?.sections?.length ?? 0) >= 1 && (
        <div className="mt-4">
          <SectionSwitcher />
        </div>
      )}

      {/* HERO: Active class OR Next class */}
      <section className="mt-5 rounded-2xl hero-gradient p-5 shadow-elevated overflow-hidden relative">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/80">
              {activeClass ? "Clase en vivo" : nextClass ? "Próxima clase" : "Hoy"}
            </span>
            {activeClass && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeClass.status === "suspended"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-white/20 text-white"
              }`}>
                {activeClass.status === "suspended" ? "SUSPENDIDA" : "EN CURSO"}
              </span>
            )}
          </div>

          {(activeClass || nextClass) ? (
            <>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {activeClass?.subject ?? nextClass?.subject}
              </h2>
              <p className="text-sm text-white/85">
                {activeClass?.teacher_name ?? nextClass?.teacher_name ?? ""}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <HeroTile icon={<MapPin className="h-4 w-4" />} label="Salón"
                  value={activeClass?.classroom ?? nextClass?.classroom ?? "—"} />
                <HeroTile icon={<Clock className="h-4 w-4" />} label="Horario"
                  value={activeClass?.schedule ?? (nextClass ? `${formatTime(nextClass.start_time)}–${formatTime(nextClass.end_time)}` : "—")} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-white/85">Sin clases programadas para hoy.</p>
          )}
        </div>
      </section>

      {/* Today's schedule preview */}
      {todaysClasses.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Hoy · {DAYS_FULL_ES[today - 1]}</h3>
            <Link to="/app/horario" className="text-xs font-medium text-accent inline-flex items-center gap-0.5">
              Ver semana <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {todaysClasses.slice(0, 3).map((s) => {
              const isPast = s.end_time.slice(0, 5) < nowHM;
              return (
                <div key={s.id} className={`surface-card flex items-center gap-3 p-3 ${isPast ? "opacity-60" : ""}`}>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-accent/10 text-accent px-2.5 py-1.5 min-w-[56px]">
                    <span className="text-xs font-bold leading-none">{formatTime(s.start_time)}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">{formatTime(s.end_time)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{s.subject}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.classroom ?? "—"}{s.teacher_name ? ` · ${s.teacher_name}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Announcements feed */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Avisos</h3>
          <Bell className="h-4 w-4 text-accent" />
        </div>
        {announcements.length === 0 ? (
          <div className="surface-card p-4 text-center text-xs text-muted-foreground">
            Sin avisos por ahora.
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <AlertCard key={a.id} kind={a.kind} scope={a.scope as any} title={a.title} body={a.body}
                time={timeAgo(a.created_at)} author={a.author_name ?? "UPT"} />
            ))}
          </div>
        )}
      </section>

      {/* Quick stats */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Materias" value={String(subjectsCount)} />
        <StatCard
          icon={sectionsCount !== null ? <Users className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
          label={sectionsCount !== null ? "Secciones" : "Clases hoy"}
          value={String(sectionsCount ?? todaysClasses.length)}
        />
      </section>

      {/* Role panel CTAs */}
      {role === "teacher" && (
        <Link to="/app/docente"
          className="mt-6 block surface-card border-l-4 border-l-accent p-4 transition-transform active:scale-[0.98] animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-accent font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Modo Docente
              </p>
              <h3 className="mt-1 text-base font-bold">Panel de control</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cambia el salón en vivo · Envía avisos a tu sección
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-accent" />
          </div>
        </Link>
      )}

      {role === "admin" && (
        <Link to="/app/admin"
          className="mt-6 block surface-card border-l-4 border-l-admin p-4 transition-transform active:scale-[0.98] animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-admin font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Zona de Administración
              </p>
              <h3 className="mt-1 text-base font-bold">Panel global UPT</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Difunde a todas las sesiones · Edita horarios · Acceso total
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-admin" />
          </div>
        </Link>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function HeroTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur p-3 border border-white/20">
      <div className="flex items-center gap-1.5 text-[11px] text-white/80">
        {icon}<span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-white truncate">{value}</p>
    </div>
  );
}

function AlertCard({ kind, scope, title, body, time, author }: { kind: string; scope?: string; title: string; body: string; time: string; author: string }) {
  const isUrgent = kind === "urgent";
  const isWarn = kind === "warning";
  const isGlobal = scope === "global";
  const Icon = isUrgent || isWarn ? AlertTriangle : isGlobal ? Globe : Bell;
  const tone = isUrgent
    ? "bg-destructive/10 text-destructive"
    : isWarn
    ? "bg-warning/15 text-warning"
    : isGlobal
    ? "bg-admin/10 text-admin"
    : "bg-accent/10 text-accent";
  return (
    <div className="surface-card flex gap-3 p-3 animate-fade-in">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate">{title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{body}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">— {author}</p>
          {isGlobal && (
            <span className="rounded-full bg-admin/15 px-1.5 py-0.5 text-[9px] font-bold text-admin">GLOBAL</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}<span>{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Badge({ children, tone, icon }: { children: React.ReactNode; tone: "accent" | "admin"; icon?: React.ReactNode }) {
  const cls = tone === "admin"
    ? "bg-admin/10 text-admin border-admin/30"
    : "bg-accent/10 text-accent border-accent/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${cls}`}>
      {icon}{children}
    </span>
  );
}
