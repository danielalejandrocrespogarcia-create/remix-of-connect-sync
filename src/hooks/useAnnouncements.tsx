import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SECTION } from "@/lib/academic";

export interface Announcement {
  id: string;
  session_group: string;
  scope?: "section" | "global" | string;
  title: string;
  body: string;
  kind: "info" | "warning" | "urgent" | string;
  author_name: string | null;
  created_at: string;
}

/**
 * Returns announcements for the given section AND every global announcement.
 * Pass `"*"` to fetch everything (admin view).
 */
export const useAnnouncements = (sessionGroup: string = DEFAULT_SECTION, limit = 20) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      let query = supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (sessionGroup !== "*") {
        // section-scoped OR global
        query = query.or(`session_group.eq.${sessionGroup},scope.eq.global`);
      }

      const { data } = await query;
      if (mounted) {
        setItems((data as Announcement[]) ?? []);
        setLoading(false);
      }
    };

    fetch();

    const channel = supabase
      .channel(`announcements:${sessionGroup}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Announcement | undefined;
          if (!row) return;
          const matches =
            sessionGroup === "*" ||
            row.session_group === sessionGroup ||
            row.scope === "global";
          if (matches) fetch();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [sessionGroup, limit]);

  return { items, loading };
};
