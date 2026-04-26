import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UPTLogo } from "@/components/UPTLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, ShieldCheck, Loader2, Lock, Eye, EyeOff, Crown } from "lucide-react";
import { CarnetUpload } from "@/components/CarnetUpload";
import { TagListEditor } from "@/components/TagListEditor";
import { ALL_SECTION_OPTIONS, DEFAULT_SECTION, SECCIONES, TRAYECTOS, buildSectionLabel } from "@/lib/academic";

const TEACHER_CODE = "UPT2026";
const ADMIN_CODE = "UPTADMIN2026";
const SUGGESTED_SUBJECTS = ["Programación II", "Bases de Datos", "Redes", "Matemática III", "Inglés Técnico", "Ingeniería de Software"];
const SUGGESTED_SECTIONS = ALL_SECTION_OPTIONS;

const baseSchema = z.object({
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(1, "Ingresa una contraseña").max(72),
});

const signupSchema = baseSchema.extend({
  fullName: z.string().trim().min(2, "Nombre muy corto").max(80),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [teacherCode, setTeacherCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTeacherCode, setShowTeacherCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [trayecto, setTrayecto] = useState("");
  const [seccion, setSeccion] = useState("");
  const [carnetFile, setCarnetFile] = useState<File | null>(null);
  const [carnetPreview, setCarnetPreview] = useState<string | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [teacherSections, setTeacherSections] = useState<string[]>([DEFAULT_SECTION]);

  const handleCarnetSelected = (file: File) => {
    setCarnetFile(file);
    if (carnetPreview) URL.revokeObjectURL(carnetPreview);
    setCarnetPreview(URL.createObjectURL(file));
  };

  const handleCarnetClear = () => {
    setCarnetFile(null);
    if (carnetPreview) URL.revokeObjectURL(carnetPreview);
    setCarnetPreview(null);
  };

  useEffect(() => {
    if (!authLoading && user) navigate("/app", { replace: true });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = baseSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Credenciales incorrectas" : error.message);
      return;
    }
    toast.success("¡Bienvenido al campus!");
    navigate("/app", { replace: true });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ email, password, fullName });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    if (role === "teacher" && teacherCode !== TEACHER_CODE) {
      toast.error("Código docente inválido. Acceso denegado.");
      return;
    }
    if (role === "admin" && teacherCode !== ADMIN_CODE) {
      toast.error("Código de administrador inválido.");
      return;
    }
    if (role === "student" && (!trayecto || !seccion)) {
      toast.error("Selecciona tu trayecto y sección.");
      return;
    }
    if (role === "teacher" && teacherSections.length === 0) {
      toast.error("Agrega al menos una sección que administrarás.");
      return;
    }

    const primarySession =
      role === "teacher" ? teacherSections[0]
      : role === "admin" ? DEFAULT_SECTION
      : buildSectionLabel(trayecto, seccion);

    setSubmitting(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: fullName,
          role,
          session_group: primarySession,
          trayecto: role === "student" ? trayecto : null,
          seccion: role === "student" ? seccion : null,
          subjects: role === "teacher" ? teacherSubjects : [],
          sections: role === "teacher" ? teacherSections : [],
        },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message.includes("already") ? "Este correo ya está registrado" : error.message);
      return;
    }

    const newUserId = signUpData.user?.id;
    if (role === "student" && carnetFile && newUserId) {
      try {
        const ext = carnetFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${newUserId}/carnet.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("carnets")
          .upload(path, carnetFile, { upsert: true, contentType: carnetFile.type });
        if (upErr) throw upErr;
        await supabase.from("profiles").update({ carnet_url: path }).eq("user_id", newUserId);
      } catch (err) {
        console.error("Carnet upload failed:", err);
        toast.warning("Cuenta creada, pero no pudimos subir el carné. Podrás cargarlo desde tu perfil.");
      }
    }

    setSubmitting(false);
    const roleLabel = role === "admin" ? "Administrador" : role === "teacher" ? "Profesor" : "Estudiante";
    toast.success(`Cuenta creada como ${roleLabel}`);
    navigate("/app", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <header className="mb-6 flex flex-col items-center text-center">
          <UPTLogo size={96} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            UPT <span className="text-accent">ARAGUA</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Campus Conectado · Federico Brito Figueroa
          </p>
        </header>

        <div className="surface-card p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="register">Registro</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="li-email">Correo institucional</Label>
                  <Input id="li-email" type="email" autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@uptaragua.edu.ve" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="li-pass">Contraseña</Label>
                  <PasswordInput id="li-pass" autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showPassword} onToggle={() => setShowPassword((s) => !s)} required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Acceder al sistema"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-5">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label className="mb-2 block">Selecciona tu rol</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <RoleCard active={role === "student"} onClick={() => setRole("student")}
                      icon={<GraduationCap className="h-5 w-5" />} label="Estudiante" tone="accent" />
                    <RoleCard active={role === "teacher"} onClick={() => setRole("teacher")}
                      icon={<ShieldCheck className="h-5 w-5" />} label="Profesor" tone="accent" />
                    <RoleCard active={role === "admin"} onClick={() => setRole("admin")}
                      icon={<Crown className="h-5 w-5" />} label="Admin" tone="admin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg-name">Nombre completo</Label>
                  <Input id="rg-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. María González" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg-email">Correo</Label>
                  <Input id="rg-email" type="email" autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg-pass">Contraseña</Label>
                  <PasswordInput id="rg-pass" autoComplete="new-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showPassword} onToggle={() => setShowPassword((s) => !s)} required />
                </div>

                {role === "student" && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div className="space-y-2">
                      <Label>Trayecto</Label>
                      <Select value={trayecto} onValueChange={setTrayecto}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          {TRAYECTOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sección</Label>
                      <Select value={seccion} onValueChange={setSeccion}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          {SECCIONES.map((s) => <SelectItem key={s} value={s}>Sección {s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(role === "teacher" || role === "admin") && (
                  <div className={`space-y-4 rounded-xl border p-3 animate-fade-in ${
                    role === "admin" ? "border-admin/40 bg-admin/5" : "border-accent/40 bg-accent/5"
                  }`}>
                    <div className="space-y-2">
                      <Label htmlFor="tcode" className={`flex items-center gap-2 ${role === "admin" ? "text-admin" : "text-accent"}`}>
                        <Lock className="h-4 w-4" /> {role === "admin" ? "Código de administrador" : "Código docente UPT"}
                      </Label>
                      <PasswordInput id="tcode" value={teacherCode}
                        onChange={(e) => setTeacherCode(e.target.value.trim().toUpperCase())}
                        placeholder={role === "admin" ? "UPTADMIN••••" : "UPT••••"} maxLength={20}
                        show={showTeacherCode} onToggle={() => setShowTeacherCode((s) => !s)} required />
                      <p className="text-xs text-muted-foreground">
                        {role === "admin"
                          ? "Solicita el código a la coordinación general."
                          : "Solicita el código a coordinación académica."}
                      </p>
                    </div>

                    {role === "teacher" && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Materias que dictas</Label>
                          <TagListEditor
                            values={teacherSubjects}
                            onChange={setTeacherSubjects}
                            placeholder="Ej. Programación II"
                            suggestions={SUGGESTED_SUBJECTS}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Secciones que administras</Label>
                          <TagListEditor
                            values={teacherSections}
                            onChange={setTeacherSections}
                            placeholder="Ej. Trayecto 2 - Sección 3"
                            suggestions={SUGGESTED_SECTIONS}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Podrás moverte entre estas secciones desde tu perfil.
                          </p>
                        </div>
                      </>
                    )}

                    {role === "admin" && (
                      <div className="rounded-lg bg-admin/10 border border-admin/30 p-3 text-xs text-admin/90 leading-relaxed">
                        <p className="font-semibold mb-1.5 flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5" /> Acceso total al campus
                        </p>
                        Como administrador tendrás permiso para:
                        <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                          <li>Entrar al chat de cualquier sesión</li>
                          <li>Difundir anuncios a una o todas las sesiones</li>
                          <li>Subir y editar horarios de cualquier sección</li>
                          <li>Cambiar de sesión desde el panel global</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {role === "student" && (
                  <>
                    <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                      Serás vinculado automáticamente a <span className="text-accent font-semibold">{trayecto && seccion ? buildSectionLabel(trayecto, seccion) : DEFAULT_SECTION}</span>.
                    </div>
                    <CarnetUpload
                      previewUrl={carnetPreview}
                      onFileSelected={handleCarnetSelected}
                      onClear={handleCarnetClear}
                      label="Foto del carné (opcional)"
                      hint="Podrás cargarlo más tarde desde tu perfil"
                    />
                  </>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          12 DIC 1976 · 16 JUL 2010
        </p>
      </div>
    </main>
  );
}

function RoleCard({ active, onClick, icon, label, tone = "accent" }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone?: "accent" | "admin" }) {
  const activeCls = tone === "admin"
    ? "border-admin bg-admin/10 text-admin"
    : "border-accent bg-accent/10 text-accent";
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
        active ? activeCls : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}>
      {icon}{label}
    </button>
  );
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  show: boolean;
  onToggle: () => void;
}

function PasswordInput({ show, onToggle, className, ...props }: PasswordInputProps) {
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={`pr-10 ${className ?? ""}`} />
      <button type="button" onClick={onToggle}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
