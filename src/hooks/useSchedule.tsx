import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleItem {
  id: string;
  session_group: string;
  day_of_week: number; // 1=Mon … 7=Sun
  start_time: string;  // HH:MM:SS
  end_time: string;
  subject: string;
  classroom: string | null;
  teacher_name: string | null;
}

export const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DAYS_FULL_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const cacheKey = (sg: string) => `upt_cache_schedule_${sg}`;

const readCache = (sg: string): ScheduleItem[] | null => {
  try {
    const raw = localStorage.getItem(cacheKey(sg));
    return raw ? (JSON.parse(raw) as ScheduleItem[]) : null;
  } catch {
    return null;
  }
};

const writeCache = (sg: string, items: ScheduleItem[]) => {
  try {
    localStorage.setItem(cacheKey(sg), JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
};

export const useSchedule = (sessionGroup: string) => {
  // Hydrate from cache for instant offline render
  const [items, setItems] = useState<ScheduleItem[]>(() => readCache(sessionGroup) ?? []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // re-hydrate when session changes
    const cached = readCache(sessionGroup);
    if (cached) setItems(cached);

    const fetch = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("session_group", sessionGroup)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (mounted) {
        if (!error && data) {
          const list = data as ScheduleItem[];
          setItems(list);
          writeCache(sessionGroup, list);
        }
        setLoading(false);
      }
    };
    fetch();

    const ch = supabase
      .channel(`schedules:${sessionGroup}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules", filter: `session_group=eq.${sessionGroup}` },
        () => fetch()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [sessionGroup]);

  return { items, loading, refetch: async () => {
    const { data } = await supabase.from("schedules").select("*").eq("session_group", sessionGroup);
    const list = (data as ScheduleItem[]) ?? [];
    setItems(list);
    writeCache(sessionGroup, list);
  }};
};

export const formatTime = (t: string) => t.slice(0, 5);
