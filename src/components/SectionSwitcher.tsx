import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SECTION_OPTIONS, DEFAULT_SECTION } from "@/lib/academic";

interface Props {
  compact?: boolean;
}

const FALLBACK_SECTIONS = ALL_SECTION_OPTIONS;

/**
 * Switches the section the current user is managing.
 * - Teachers: only their assigned sections.
 * - Admins:   every section that exists in profiles + active_class + schedules.
 */
export const SectionSwitcher = ({ compact = false }: Props) => {
  const { role, profile, activeSection, setActiveSection } = useAuth();
  const [allSections, setAllSections] = useState<string[]>([]);

  useEffect(() => {
    if (role !== "admin") return;
    let cancel = false;
    (async () => {
      const [{ data: profs }, { data: cls }, { data: scheds }] = await Promise.all([
        supabase.from("profiles").select("session_group, sections"),
        supabase.from("active_class").select("session_group"),
        supabase.from("schedules").select("session_group"),
      ]);
      const set = new Set<string>(FALLBACK_SECTIONS);
      profs?.forEach((p: any) => {
        if (p.session_group) set.add(p.session_group);
        (p.sections ?? []).forEach((s: string) => s && set.add(s));
      });
      cls?.forEach((c: any) => c.session_group && set.add(c.session_group));
      scheds?.forEach((s: any) => s.session_group && set.add(s.session_group));
      if (!cancel) setAllSections(Array.from(set).sort());
    })();
    return () => { cancel = true; };
  }, [role]);

  if (role !== "teacher" && role !== "admin") return null;

  const sections =
    role === "admin"
      ? allSections
      : (profile?.sections?.length ? profile.sections : [profile?.session_group ?? DEFAULT_SECTION]);

  const handleChange = async (value: string) => {
    await setActiveSection(value);
    toast.success(`Ahora ves: ${value}`);
  };

  return (
    <div className={compact ? "" : "surface-card p-3 flex items-center gap-2"}>
      {!compact && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
          <Layers className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {!compact && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {role === "admin" ? "Sección visible" : "Sección activa"}
          </p>
        )}
        <Select value={activeSection} onValueChange={handleChange}>
          <SelectTrigger className={compact ? "h-8 text-xs" : "h-8 mt-0.5 text-sm font-semibold"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
