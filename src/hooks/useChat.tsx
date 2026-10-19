import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SECTION } from "@/lib/academic";

export interface ChatMessage {
  id: string;
  session_group: string;
  user_id: string;
  content: string;
  message_type: "text" | "voice" | string;
  duration_seconds: number | null;
  created_at: string;
}

export interface ProfileLite {
  user_id: string;
  full_name: string;
  session_group: string;
}

const msgCacheKey = (sg: string) => `upt_cache_chat_msgs_${sg}`;
const profCacheKey = (sg: string) => `upt_cache_chat_profs_${sg}`;
const readJSON = <T,>(k: string): T | null => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : null; } catch { return null; }
};
const writeJSON = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
};

export const useChat = (mySessionGroup: string = DEFAULT_SECTION) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => readJSON<ChatMessage[]>(msgCacheKey(mySessionGroup)) ?? []
  );
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>(
    () => readJSON<Record<string, ProfileLite>>(profCacheKey(mySessionGroup)) ?? {}
  );
  const [loading, setLoading] = useState(true);
  const profilesRef = useRef(profilesMap);
  profilesRef.current = profilesMap;

  const ensureProfile = async (userId: string) => {
    if (profilesRef.current[userId]) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, session_group")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setProfilesMap((prev) => ({ ...prev, [userId]: data as ProfileLite }));
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // load all messages from this session_group only? we want chat exclusive to mySession
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_group", mySessionGroup)
        .order("created_at", { ascending: true })
        .limit(200);

      const messagesData = (msgs as ChatMessage[]) ?? [];

      // load profiles for all unique senders
      const ids = Array.from(new Set(messagesData.map((m) => m.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, session_group")
          .in("user_id", ids);
        const map: Record<string, ProfileLite> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        if (mounted) { setProfilesMap(map); writeJSON(profCacheKey(mySessionGroup), map); }
      }

      if (mounted) {
        setMessages(messagesData);
        writeJSON(msgCacheKey(mySessionGroup), messagesData.slice(-100));
        setLoading(false);
      }
    };

    init();

    const channel = supabase
      .channel(`chat:${mySessionGroup}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_group=eq.${mySessionGroup}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          await ensureProfile(msg.user_id);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg];
            writeJSON(msgCacheKey(mySessionGroup), next.slice(-100));
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `session_group=eq.${mySessionGroup}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [mySessionGroup]);

  /**
   * Returns display name for a user.
   * - Same session as me → real name
   * - Different session → Usuario_Anonimo_XXXX (last 4 of user_id)
   */
  const getDisplayName = (userId: string): string => {
    const prof = profilesMap[userId];
    if (!prof) return "Usuario_Anonimo_XXXX";
    if (prof.session_group === mySessionGroup) return prof.full_name;
    return `Usuario_Anonimo_${userId.slice(-4).toUpperCase()}`;
  };

  const sendText = async (userId: string, content: string) => {
    if (!content.trim()) return;
    return supabase.from("chat_messages").insert({
      user_id: userId,
      content: content.trim(),
      message_type: "text",
      session_group: mySessionGroup,
    });
  };

  const sendVoice = async (userId: string, label: string, duration: number) => {
    return supabase.from("chat_messages").insert({
      user_id: userId,
      content: label,
      message_type: "voice",
      duration_seconds: duration,
      session_group: mySessionGroup,
    });
  };

  return { messages, loading, getDisplayName, sendText, sendVoice };
};
