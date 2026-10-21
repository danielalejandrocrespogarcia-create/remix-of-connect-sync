import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SECTION } from "@/lib/academic";

export type AppRole = "student" | "teacher" | "admin";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  session_group: string;
  trayecto?: string | null;
  seccion?: string | null;
  carnet_url?: string | null;
  subjects?: string[] | null;
  sections?: string[] | null;
  active_section?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  /** The session currently being viewed/managed.
   *  - Students: their fixed `session_group`
   *  - Teachers: `active_section` from profile (mutable via setActiveSection) */
  activeSection: string;
  setActiveSection: (section: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [sessionLoading, setLoading] = useState(true);
  // Profile/role load separately from the session; screens that depend on the
  // role (teacher/admin panels) must wait for both or they redirect too early.
  const [profileLoading, setProfileLoading] = useState(false);
  const loading = sessionLoading || profileLoading;

  const loadProfileAndRole = async (uid: string) => {
    setProfileLoading(true);
    try {
      const [{ data: prof, error: profErr }, { data: roleRows, error: roleErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (profErr) console.error("Error cargando perfil:", profErr.message);
      if (roleErr) console.error("Error cargando rol:", roleErr.message);
      setProfile(prof as Profile | null);
      // A user could have more than one row; pick the highest privilege.
      const roles = (roleRows ?? []).map((r: { role: string }) => r.role as AppRole);
      const best: AppRole | null = roles.includes("admin")
        ? "admin"
        : roles.includes("teacher")
          ? "teacher"
          : roles.includes("student")
            ? "student"
            : null;
      setRole(best);
    } catch (err) {
      console.error("Error de conexión al cargar el perfil:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let lastUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Only reload profile when the user actually changes (login/logout),
      // not on TOKEN_REFRESHED / USER_UPDATED which fire periodically.
      const newUserId = newSession?.user?.id ?? null;
      if (newUserId !== lastUserId) {
        lastUserId = newUserId;
        if (newUserId) {
          setTimeout(() => {
            if (mounted) loadProfileAndRole(newUserId);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }

      // Initial session event ends the loading state.
      if (event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    // Fallback in case INITIAL_SESSION never fires (older SDKs).
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      if (existing?.user && lastUserId !== existing.user.id) {
        lastUserId = existing.user.id;
        setSession(existing);
        setUser(existing.user);
        loadProfileAndRole(existing.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  const setActiveSection = async (section: string) => {
    if (!user || !profile) return;
    // optimistic
    setProfile({ ...profile, active_section: section });
    await supabase.from("profiles").update({ active_section: section }).eq("user_id", user.id);
  };

  // Students stay on their fixed session_group; teachers/admins use active_section if set.
  const activeSection =
    role === "teacher" || role === "admin"
      ? (profile?.active_section || profile?.sections?.[0] || profile?.session_group || DEFAULT_SECTION)
      : (profile?.session_group || DEFAULT_SECTION);

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, activeSection, setActiveSection, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
