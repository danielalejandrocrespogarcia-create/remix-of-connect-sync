import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Global notifications: listens to new chat messages (in active section)
 * and new announcements (section + global). Shows browser notifications
 * (when permission granted) and an in-app toast as fallback.
 */
export const useNotifications = () => {
  const { user, activeSection, role } = useAuth();
  const senderNamesRef = useRef<Record<string, { name: string; role: string | null }>>({});

  // Ask permission once after login
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Slight delay so it doesn't fire on first paint
      const t = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [user]);

  const notify = (title: string, body: string, tag?: string) => {
    // Always show in-app toast
    toast(title, { description: body });
    // Browser notification if allowed and tab not focused (or always)
    try {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(title, {
          body,
          tag,
          icon: "/placeholder.svg",
          badge: "/placeholder.svg",
        });
      }
    } catch {
      /* ignore */
    }
  };

  // Subscribe to chat messages of the active section
  useEffect(() => {
    if (!user || !activeSection) return;

    const channel = supabase
      .channel(`notify-chat:${activeSection}:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_group=eq.${activeSection}`,
        },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            user_id: string;
            content: string;
            message_type: string;
          };
          if (msg.user_id === user.id) return; // skip own messages

          // Resolve sender info (cached)
          let info = senderNamesRef.current[msg.user_id];
          if (!info) {
            const [{ data: prof }, { data: roleRow }] = await Promise.all([
              supabase
                .from("profiles")
                .select("full_name, session_group")
                .eq("user_id", msg.user_id)
                .maybeSingle(),
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", msg.user_id)
                .maybeSingle(),
            ]);
            const sameSection =
              prof && (prof as any).session_group === activeSection;
            info = {
              name: sameSection
                ? (prof as any)?.full_name ?? "Compañero"
                : `Usuario_Anonimo_${msg.user_id.slice(-4).toUpperCase()}`,
              role: (roleRow as any)?.role ?? null,
            };
            senderNamesRef.current[msg.user_id] = info;
          }

          const isTeacher = info.role === "teacher" || info.role === "admin";
          const prefix = isTeacher ? "👨‍🏫 Profesor" : "💬 Mensaje";
          const title = `${prefix} · ${info.name}`;
          const body =
            msg.message_type === "voice"
              ? "🎤 Mensaje de voz"
              : msg.content.slice(0, 120);

          notify(title, body, `chat-${activeSection}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeSection]);

  // Subscribe to all new announcements (section + global)
  useEffect(() => {
    if (!user || !activeSection) return;

    const channel = supabase
      .channel(`notify-ann:${activeSection}:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const a = payload.new as {
            id: string;
            title: string;
            body: string;
            kind: string;
            scope: string;
            session_group: string;
            author_id: string | null;
            author_name: string | null;
          };
          if (a.author_id === user.id) return;
          const matches =
            a.scope === "global" || a.session_group === activeSection;
          if (!matches) return;

          const icon =
            a.kind === "urgent" ? "🚨" : a.kind === "warning" ? "⚠️" : "📢";
          const author = a.author_name ? ` · ${a.author_name}` : "";
          notify(`${icon} Aviso${author}`, `${a.title}\n${a.body}`.slice(0, 200), `ann-${a.id}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeSection, role]);
};
