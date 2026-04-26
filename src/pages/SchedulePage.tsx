import { useAuth } from "@/hooks/useAuth";
import { useSchedule, DAYS_ES, DAYS_FULL_ES, formatTime } from "@/hooks/useSchedule";
import { Calendar, Clock, MapPin, User, Loader2 } from "lucide-react";
import { useMemo } from "react";

export default function SchedulePage() {
  const { activeSection, profile, role, loading } = useAuth();
  const section = activeSection;
  const { items, loading: loadingSched } = useSchedule(section);

  const today = (new Date().getDay() + 6) % 7 + 1; // 1..7 Mon..Sun

  const grouped = useMemo(() => {
    const map: Record<number, typeof items> = {};
    for (let d = 1; d <= 7; d++) map[d] = [];
    items.forEach((s) => map[s.day_of_week].push(s));
    return map;
  }, [items]);

  if (loading) return <Loader />;

  return (
    <div className="px-4 pt-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Mi semana</p>
          <h1 className="text-lg font-bold leading-tight">Horario · {section}</h1>
          {role === "student" && (
            <p className="text-xs text-muted-foreground">{profile?.trayecto ?? ""} {profile?.seccion ? `· Sección ${profile.seccion}` : ""}</p>
          )}
        </div>
      </header>

      {/* Day chips */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {DAYS_ES.map((d, i) => {
          const active = i + 1 === today;
          return (
            <a key={d} href={`#day-${i + 1}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"
              }`}>
              {d}
            </a>
          );
        })}
      </div>

      {loadingSched ? <Loader /> : items.length === 0 ? (
        <div className="surface-card mt-6 p-6 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium">Aún no hay horario publicado</p>
          <p className="text-xs text-muted-foreground mt-1">
            La administración configurará pronto las clases de esta sección.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5 pb-6">
          {DAYS_FULL_ES.map((day, i) => {
            const dayN = i + 1;
            const list = grouped[dayN];
            if (list.length === 0) return null;
            const isToday = dayN === today;
            return (
              <section key={day} id={`day-${dayN}`} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider">{day}</h2>
                  {isToday && <span className="rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">HOY</span>}
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {list.map((s) => (
                    <article key={s.id} className="surface-card p-4 animate-fade-in">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold truncate">{s.subject}</h3>
                          {s.teacher_name && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {s.teacher_name}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                          {formatTime(s.start_time)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        </span>
                        {s.classroom && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {s.classroom}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Loader = () => (
  <div className="flex h-40 items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-accent" />
  </div>
);
