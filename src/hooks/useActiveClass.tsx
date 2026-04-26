import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SECTION } from "@/lib/academic";

export interface ActiveClass {
  id: string;
  session_group: string;
  subject: string;
  teacher_name: string | null;
  classroom: string;
  schedule: string | null;
  status: string;
  updated_at: string;
}

export const useActiveClass = (sessionGroup: string = DEFAULT_SECTION) => {
  const [data, setData] = useState<ActiveClass | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      const { data: row } = await supabase
        .from("active_class")
        .select("*")
        .eq("session_group", sessionGroup)
        .maybeSingle();
      if (mounted) {
        setData(row as ActiveClass | null);
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`active_class:${sessionGroup}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_class", filter: `session_group=eq.${sessionGroup}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [sessionGroup]);

  return { data, loading };
};
