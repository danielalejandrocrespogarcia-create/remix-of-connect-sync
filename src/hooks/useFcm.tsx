import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { onForegroundMessage, requestFcmToken } from "@/lib/firebase";
import { toast } from "sonner";
import { isCapacitorApp } from "@/lib/platform";

/**
 * Registers the FCM service worker, requests permission, retrieves the token
 * and stores it on the user's profile (best-effort). Also forwards
 * foreground push notifications to the in-app toast system.
 *
 * Guarded so it never runs inside the Lovable iframe/preview.
 */
export const useFcm = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Web push does not work inside the Android WebView.
    if (isCapacitorApp) return;

    // Skip in iframe / preview hosts
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }
    const host = window.location.hostname;
    const isPreview =
      host.includes("lovableproject.com") ||
      host.includes("lovable.app") && host.includes("id-preview--");
    if (inIframe || isPreview) return;
    if (!("serviceWorker" in navigator)) return;

    let unsubForeground = () => {};

    (async () => {
      try {
        await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        });
      } catch (err) {
        console.warn("[SW] register failed", err);
        return;
      }

      // Foreground messages → toast
      unsubForeground = onForegroundMessage(({ title, body }) => {
        toast(title || "UPT Aragua", { description: body });
      });

      if (!user) return;

      const token = await requestFcmToken();
      if (!token) return;

      // Best-effort: persist on profile if a column exists. Silently ignore otherwise.
      try {
        await supabase
          .from("profiles")
          .update({ fcm_token: token } as never)
          .eq("user_id", user.id);
      } catch {
        /* column may not exist – ignore */
      }
    })();

    return () => unsubForeground();
  }, [user]);
};
