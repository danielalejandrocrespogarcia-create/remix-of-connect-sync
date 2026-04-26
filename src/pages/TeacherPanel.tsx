import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClass } from "@/hooks/useActiveClass";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionSwitcher } from "@/components/SectionSwitcher";
import { ChevronLeft, MapPin, Megaphone, Loader2, Save, Bell, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function TeacherPanel() {
  const { user, role, profile, activeSection, loading } = useAuth();
  const SESSION = activeSection;
  const { data: activeClass } = useActiveClass(SESSION);

  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [schedule, setSchedule] = useState("");
  const [savingClass, setSavingClass] = useState(false);

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annKind, setAnnKind] = useState<"info" | "warning" | "urgent">("info");
  const [sendingAnn, setSendingAnn] = useState(false);

  useEffect(() => {
    if (activeClass) {
      setClassroom(activeClass.classroom ?? "");
      setSubject(activeClass.subject ?? "");
      setSchedule(activeClass.schedule ?? "");
    } else {
      setClassroom("");
      setSubject("");
      setSchedule("");
    }
  }, [activeClass, SESSION]);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (role !== "teacher" && role !== "admin") return <Navigate to="/app" replace />;

  const saveClass = async () => {
    if (!classroom.trim() || !subject.trim()) {
      toast.error("Salón y materia son obligatorios");
      return;
    }
    setSavingClass(true);
    const payload = {
      session_group: SESSION,
      subject: subject.trim(),
      classroom: classroom.trim(),
      schedule: schedule.trim() || null,
      teacher_name: profile?.full_name ?? "Profesor",
      status: "active",
      updated_by: user?.id,
    };
    const { error } = activeClass
      ? await supabase.from("active_class").update(payload).eq("session_group", SESSION)
      : await supabase.from("active_class").insert(payload);
    setSavingClass(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Clase actualizada en ${SESSION}`);
  };

  const sendAnnouncement = async (preset?: { title: string; body: string; kind: typeof annKind }) => {
    const data = preset ?? { title: annTitle, body: annBody, kind: annKind };
    if (!data.title.trim() || !data.body.trim()) {
      toast.error("Completa título y mensaje");
      return;
    }
    setSendingAnn(true);
    const { error } = await supabase.from("announcements").insert({
      session_group: SESSION,
      title: data.title.trim(),
      body: data.body.trim(),
      kind: data.kind,
      author_id: user!.id,
      author_name: profile?.full_name ?? "Profesor",
    });
    setSendingAnn(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Anuncio enviado a ${SESSION}`);
    if (!preset) { setAnnTitle(""); setAnnBody(""); }
  };

  const suspendClass = async () => {
    if (!activeClass) return;
    const { error } = await supabase.from("active_class")
      .update({ status: "suspended", updated_by: user?.id })
      .eq("session_group", SESSION);
    if (error) { toast.error(error.message); return; }
    toast.success("Clase marcada como suspendida");
    sendAnnouncement({
      title: "Clase suspendida",
      body: `La clase de ${subject || activeClass.subject} ha sido suspendida.`,
      kind: "urgent",
    });
  };

  const teacherSubjects = profile?.subjects ?? [];

  return (
    <div className="px-4 pt-6">
      <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
        <ChevronLeft className="h-4 w-4" /> Volver
      </Link>

      <header className="mt-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 neon-border">
          <ShieldCheck className="h-6 w-6 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-accent">Panel Docente</p>
          <h1 className="text-lg font-bold truncate">Control de {SESSION}</h1>
        </div>
      </header>

      {/* Section switcher */}
      <div className="mt-4">
        <SectionSwitcher />
      </div>

      {/* Manage classroom */}
      <section className="neon-card mt-5 p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Cambiar Salón</h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="subj">Materia</Label>
            {teacherSubjects.length > 0 ? (
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="subj">
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  {teacherSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Programación II" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room">Salón / Laboratorio</Label>
            <Input id="room" value={classroom} onChange={(e) => setClassroom(e.target.value)}
              placeholder="Ej. Lab Redes - Aula 4" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sch">Horario</Label>
            <Input id="sch" value={schedule} onChange={(e) => setSchedule(e.target.value)}
              placeholder="Ej. 08:00 - 10:00" />
          </div>
          <Button variant="neon" onClick={saveClass} disabled={savingClass} className="w-full">
            {savingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Actualizar en vivo</>}
          </Button>
        </div>
      </section>

      {/* Quick alerts */}
      <section className="neon-card mt-5 p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Alertas Rápidas</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <Button variant="neon" className="w-full justify-start" disabled={sendingAnn}
            onClick={() => sendAnnouncement({
              title: "¡La clase va a comenzar!",
              body: `Nos vemos en ${classroom || "el salón indicado"} en pocos minutos.`,
              kind: "warning",
            })}>
            <Megaphone className="h-4 w-4" /> Avisar inicio de clase
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled={sendingAnn}
            onClick={suspendClass}>
            <AlertTriangle className="h-4 w-4 text-destructive" /> Suspender clase
          </Button>
        </div>
      </section>

      {/* Custom announcement */}
      <section className="neon-card mt-5 p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Anuncio Personalizado</h2>
        </div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Título</Label>
            <Input id="ann-title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)}
              maxLength={80} placeholder="Ej. Examen reprogramado" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Mensaje</Label>
            <Textarea id="ann-body" value={annBody} onChange={(e) => setAnnBody(e.target.value)}
              maxLength={300} rows={3} placeholder="Detalles para los estudiantes..." />
          </div>
          <div className="flex gap-2">
            {(["info", "warning", "urgent"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setAnnKind(k)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
                  annKind === k ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                }`}>
                {k === "info" ? "Info" : k === "warning" ? "Aviso" : "Urgente"}
              </button>
            ))}
          </div>
          <Button variant="neon" onClick={() => sendAnnouncement()} disabled={sendingAnn} className="w-full">
            {sendingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar anuncio"}
          </Button>
        </div>
      </section>
    </div>
  );
}
