import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, Megaphone, Loader2, Bell, AlertTriangle, ShieldCheck,
  Globe, Users, Calendar, Trash2, Plus, Layers
} from "lucide-react";
import { toast } from "sonner";
import { DAYS_FULL_ES, useSchedule, formatTime } from "@/hooks/useSchedule";
import { SectionSwitcher } from "@/components/SectionSwitcher";
import { ALL_SECTION_OPTIONS, DEFAULT_SECTION } from "@/lib/academic";

export default function AdminPanel() {
  const { user, role, profile, activeSection, loading } = useAuth();

  // ----- Global announcement state
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annKind, setAnnKind] = useState<"info" | "warning" | "urgent">("info");
  const [annScope, setAnnScope] = useState<"global" | "section">("global");
  const [sendingAnn, setSendingAnn] = useState(false);

  // ----- Schedule state
  const [allSections, setAllSections] = useState<string[]>([]);
  const [scheduleSection, setScheduleSection] = useState<string>("");
  const { items: schedule, refetch } = useSchedule(scheduleSection || "__none__");

  const [newDay, setNewDay] = useState<string>("1");
  const [newStart, setNewStart] = useState("08:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newSubject, setNewSubject] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);

  const { items: recentGlobal } = useAnnouncements("*", 20);
  const globalOnly = recentGlobal.filter(a => a.scope === "global");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [{ data: profs }, { data: cls }] = await Promise.all([
        supabase.from("profiles").select("session_group, sections"),
        supabase.from("active_class").select("session_group"),
      ]);
      const set = new Set<string>(ALL_SECTION_OPTIONS);
      profs?.forEach((p: any) => {
        if (p.session_group) set.add(p.session_group);
        (p.sections ?? []).forEach((s: string) => s && set.add(s));
      });
      cls?.forEach((c: any) => c.session_group && set.add(c.session_group));
      const list = Array.from(set).sort();
      if (!cancel) {
        setAllSections(list);
        setScheduleSection(prev => prev || list[0] || DEFAULT_SECTION);
      }
    })();
    return () => { cancel = true; };
  }, []);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-admin" /></div>;
  }
  if (role !== "admin") return <Navigate to="/app" replace />;

  const sendAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      toast.error("Completa título y mensaje");
      return;
    }
    setSendingAnn(true);
    const { error } = await supabase.from("announcements").insert({
      session_group: annScope === "global" ? "__all__" : activeSection,
      scope: annScope,
      title: annTitle.trim(),
      body: annBody.trim(),
      kind: annKind,
      author_id: user!.id,
      author_name: profile?.full_name ?? "Administración UPT",
    });
    setSendingAnn(false);
    if (error) { toast.error(error.message); return; }
    toast.success(annScope === "global" ? "Anuncio enviado a TODAS las sesiones" : `Anuncio enviado a ${activeSection}`);
    setAnnTitle(""); setAnnBody("");
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Anuncio eliminado");
  };

  const addSlot = async () => {
    if (!scheduleSection || !newSubject.trim()) {
      toast.error("Completa la materia");
      return;
    }
    setSavingSlot(true);
    const { error } = await supabase.from("schedules").insert({
      session_group: scheduleSection,
      day_of_week: Number(newDay),
      start_time: newStart,
      end_time: newEnd,
      subject: newSubject.trim(),
      classroom: newRoom.trim() || null,
      teacher_name: newTeacher.trim() || null,
      created_by: user?.id ?? null,
    });
    setSavingSlot(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bloque añadido al horario");
    setNewSubject(""); setNewRoom(""); setNewTeacher("");
    refetch();
  };

  const removeSlot = async (id: string) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Bloque eliminado"); refetch(); }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-admin">
        <ChevronLeft className="h-4 w-4" /> Volver
      </Link>

      {/* HERO */}
      <header className="mt-3 rounded-2xl admin-gradient p-5 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/80">Zona de administración</p>
            <h1 className="text-lg font-bold text-white truncate">Panel Global UPT</h1>
            <p className="text-xs text-white/80 mt-0.5">Acceso a todas las sesiones</p>
          </div>
        </div>
      </header>

      {/* Section switcher (admin sees all) */}
      <div className="mt-4">
        <SectionSwitcher />
      </div>

      {/* Broadcast announcement */}
      <section className="surface-card mt-5 p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-admin" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Difundir anuncio</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <ScopeButton active={annScope === "global"} onClick={() => setAnnScope("global")}
            icon={<Globe className="h-4 w-4" />} label="Toda la UPT" tone="admin" />
          <ScopeButton active={annScope === "section"} onClick={() => setAnnScope("section")}
            icon={<Users className="h-4 w-4" />} label={`Solo ${activeSection}`} tone="accent" />
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Título</Label>
            <Input id="ann-title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)}
              maxLength={80} placeholder="Ej. Suspensión de actividades" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Mensaje</Label>
            <Textarea id="ann-body" value={annBody} onChange={(e) => setAnnBody(e.target.value)}
              maxLength={400} rows={3} placeholder="Información para los estudiantes…" />
          </div>
          <div className="flex gap-2">
            {(["info", "warning", "urgent"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setAnnKind(k)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                  annKind === k
                    ? k === "urgent"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : k === "warning"
                      ? "border-warning bg-warning/10 text-warning"
                      : "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground"
                }`}>
                {k === "info" ? "Info" : k === "warning" ? "Aviso" : "Urgente"}
              </button>
            ))}
          </div>
          <Button onClick={sendAnnouncement} disabled={sendingAnn} className="w-full bg-admin hover:bg-admin/90 text-admin-foreground">
            {sendingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Megaphone className="h-4 w-4 mr-2" /> Enviar</>}
          </Button>
        </div>
      </section>

      {/* Schedule editor */}
      <section className="surface-card mt-5 p-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-admin" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Horario por sección</h2>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Sección a editar</Label>
          <Select value={scheduleSection} onValueChange={setScheduleSection}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {allSections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="space-y-1.5 col-span-2">
            <Label>Materia</Label>
            <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Ej. Programación II" />
          </div>
          <div className="space-y-1.5">
            <Label>Día</Label>
            <Select value={newDay} onValueChange={setNewDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS_FULL_ES.map((d, i) => (
                  <SelectItem key={d} value={String(i + 1)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Salón</Label>
            <Input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="Aula 4" />
          </div>
          <div className="space-y-1.5">
            <Label>Inicio</Label>
            <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fin</Label>
            <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Profesor</Label>
            <Input value={newTeacher} onChange={(e) => setNewTeacher(e.target.value)} placeholder="Prof. Luis Pérez" />
          </div>
        </div>
        <Button onClick={addSlot} disabled={savingSlot} className="mt-3 w-full">
          {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Añadir bloque</>}
        </Button>

        <div className="mt-5 space-y-2">
          {schedule.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Sin bloques de horario aún.</p>
          ) : schedule.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{s.subject}</p>
                <p className="text-[11px] text-muted-foreground">
                  {DAYS_FULL_ES[s.day_of_week - 1]} · {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  {s.classroom ? ` · ${s.classroom}` : ""}
                </p>
              </div>
              <button onClick={() => removeSlot(s.id)} aria-label="Eliminar"
                className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Recent global announcements */}
      <section className="surface-card mt-5 p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-admin" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Anuncios globales recientes</h2>
        </div>
        {globalOnly.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground text-center py-2">Aún no hay anuncios globales.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {globalOnly.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate">{a.title}</p>
                  <button onClick={() => deleteAnnouncement(a.id)}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                <p className="text-[10px] uppercase tracking-wider text-admin mt-1">— {a.author_name ?? "Admin"}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ScopeButton({ active, onClick, icon, label, tone }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone: "admin" | "accent";
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
        active
          ? tone === "admin"
            ? "border-admin bg-admin/10 text-admin"
            : "border-accent bg-accent/10 text-accent"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}>
      {icon}{label}
    </button>
  );
}
