import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UPTLogo } from "@/components/UPTLogo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogOut, Mail, Users, ShieldCheck, GraduationCap, IdCard, AlertCircle, BookOpen, Layers, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CarnetUpload } from "@/components/CarnetUpload";
import { TagListEditor } from "@/components/TagListEditor";
import { SectionSwitcher } from "@/components/SectionSwitcher";

import { ALL_SECTION_OPTIONS } from "@/lib/academic";

const SUGGESTED_SUBJECTS = ["Programación II", "Bases de Datos", "Redes", "Matemática III", "Inglés Técnico", "Ingeniería de Software"];
const SUGGESTED_SECTIONS = ALL_SECTION_OPTIONS;

export default function Profile() {
  const { profile, role, user, signOut, refresh } = useAuth();
  const [carnetSignedUrl, setCarnetSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Teacher editor state
  const [subjects, setSubjects] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [savingTeacher, setSavingTeacher] = useState(false);

  useEffect(() => {
    setSubjects(profile?.subjects ?? []);
    setSections(profile?.sections?.length ? profile.sections : (profile?.session_group ? [profile.session_group] : []));
  }, [profile]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const path = profile?.carnet_url;
      if (!path) { setCarnetSignedUrl(null); return; }
      const { data, error } = await supabase.storage.from("carnets").createSignedUrl(path, 60 * 60);
      if (active && !error) setCarnetSignedUrl(data?.signedUrl ?? null);
    };
    load();
    return () => { active = false; };
  }, [profile]);

  const handleLogout = async () => { await signOut(); toast.success("Sesión cerrada"); };

  const handleCarnetUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/carnet.${ext}`;
      const { error: upErr } = await supabase.storage.from("carnets").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("profiles").update({ carnet_url: path }).eq("user_id", user.id);
      if (updErr) throw updErr;
      toast.success("Carné actualizado");
      await refresh();
    } catch (err: any) {
      toast.error("No se pudo subir el carné: " + (err.message ?? "error"));
    } finally { setUploading(false); }
  };

  const handleCarnetClear = async () => {
    if (!user || !profile?.carnet_url) return;
    setUploading(true);
    try {
      await supabase.storage.from("carnets").remove([profile.carnet_url]);
      await supabase.from("profiles").update({ carnet_url: null }).eq("user_id", user.id);
      toast.success("Carné eliminado");
      await refresh();
    } catch { toast.error("No se pudo eliminar"); }
    finally { setUploading(false); }
  };

  const saveTeacherInfo = async () => {
    if (!user) return;
    if (sections.length === 0) { toast.error("Debes tener al menos una sección"); return; }
    setSavingTeacher(true);
    // ensure active_section is still in the list, otherwise reset to first
    const stillValid = profile?.active_section && sections.includes(profile.active_section);
    const updates: any = { subjects, sections };
    if (!stillValid) updates.active_section = sections[0];

    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    setSavingTeacher(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Información docente actualizada");
    await refresh();
  };

  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";
  const isStaff = isTeacher || isAdmin;
  const carnetPath = profile?.carnet_url;

  return (
    <div className="px-4 pt-6">
      <header className="flex flex-col items-center text-center">
        <UPTLogo size={88} />
        <h1 className="mt-4 text-xl font-bold">{profile?.full_name ?? "—"}</h1>
        <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
          isAdmin ? "border-admin/40 bg-admin/10 text-admin"
          : isTeacher ? "border-accent/40 bg-accent/10 text-accent"
          : "border-accent/40 bg-accent/10 text-accent"
        }`}>
          {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : isTeacher ? <ShieldCheck className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
          {isAdmin ? "ADMINISTRADOR" : isTeacher ? "PROFESOR" : "ESTUDIANTE"}
        </div>
      </header>

      <section className="mt-6 space-y-2">
        <InfoRow icon={<Mail className="h-4 w-4" />} label="Correo" value={user?.email ?? "—"} />
        {isStudent && (
          <>
            <InfoRow icon={<Users className="h-4 w-4" />} label="Grupo" value={profile?.session_group ?? "Sesión 1"} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Trayecto" value={profile?.trayecto ?? "—"} />
            <InfoRow icon={<IdCard className="h-4 w-4" />} label="Sección" value={profile?.seccion ?? "—"} />
          </>
        )}
      </section>

      {/* TEACHER/ADMIN: Section switcher */}
      {isStaff && (
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Sección actual</h3>
          </div>
          <SectionSwitcher />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {isAdmin
              ? "Como admin puedes navegar TODAS las sesiones."
              : "La sección activa filtra el panel docente, los avisos y el chat."}
          </p>
        </section>
      )}

      {/* TEACHER/ADMIN: Subjects + Sections editor */}
      {isStaff && (
        <section className="mt-6 surface-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Mi cátedra</h3>
          </div>

          <div className="space-y-2">
            <Label>Materias que dictas</Label>
            <TagListEditor
              values={subjects}
              onChange={setSubjects}
              placeholder="Ej. Programación II"
              suggestions={SUGGESTED_SUBJECTS}
            />
          </div>

          <div className="space-y-2">
            <Label>Secciones que administras</Label>
            <TagListEditor
              values={sections}
              onChange={setSections}
              placeholder="Ej. Trayecto 2 - Sección 3"
              suggestions={SUGGESTED_SECTIONS}
            />
          </div>

          <Button variant="neon" className="w-full" onClick={saveTeacherInfo} disabled={savingTeacher}>
            {savingTeacher ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Guardar cambios</>}
          </Button>
        </section>
      )}

      {/* STUDENT: Carnet */}
      {isStudent && (
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <IdCard className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Carné Estudiantil</h3>
          </div>

          {!carnetPath && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/5 p-3 text-xs text-accent">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Aún no has cargado tu carné. Súbelo para validar tu identidad como estudiante UPT.</span>
            </div>
          )}

          <CarnetUpload
            previewUrl={carnetSignedUrl}
            onFileSelected={handleCarnetUpload}
            onClear={handleCarnetClear}
            loading={uploading}
            onView={() => carnetSignedUrl && window.open(carnetSignedUrl, "_blank")}
            label={carnetPath ? "Tu carné" : "Cargar carné"}
          />
        </section>
      )}

      <section className="mt-6 neon-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Universidad</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Universidad Politécnica Territorial Federico Brito Figueroa · Aragua
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-accent">
          12 DIC 1976 · 16 JUL 2010
        </p>
      </section>

      <Button onClick={handleLogout} variant="outline" className="mt-6 w-full">
        <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
      </Button>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="neon-card flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
