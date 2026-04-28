// Firebase Web SDK – Cloud Messaging only (Auth/DB stay on Supabase)
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

// Publishable Firebase web config (safe in client code)
export const firebaseConfig = {
  apiKey: "AIzaSyDE4uzYZP-rGnxEsRwzTC3taETBrNqdHQc",
  authDomain: "upt-7786c.firebaseapp.com",
  projectId: "upt-7786c",
  storageBucket: "upt-7786c.firebasestorage.app",
  messagingSenderId: "791369394725",
  appId: "1:791369394725:web:b7f177a47d9db302cd6dcc",
};

// Public VAPID key for Web Push
export const VAPID_KEY =
  "BNFQLoWRW49aw0JCNtgW9nsNrCuBqBrFeO-9_CyG1WRSQVAkp8_rcWUbgg4mndNhpUUQZISCxG4ynC95-YDsrsA";

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messagingInstance: Messaging | null = null;

export const getMessagingIfSupported = async (): Promise<Messaging | null> => {
  try {
    if (typeof window === "undefined") return null;
    const supported = await isSupported();
    if (!supported) return null;
    if (!messagingInstance) messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch {
    return null;
  }
};

/**
 * Request notification permission and retrieve the FCM token.
 * Returns null if unsupported, blocked, or in iframe/preview.
 */
export const requestFcmToken = async (): Promise<string | null> => {
  // Skip in iframe/preview
  try {
    if (window.self !== window.top) return null;
  } catch {
    return null;
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  if (!("Notification" in window)) return null;
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return null;

  // Use the SW we registered manually
  const swReg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (err) {
    console.warn("[FCM] getToken failed:", err);
    return null;
  }
};

/** Listen for foreground push messages. */
export const onForegroundMessage = (
  handler: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
) => {
  let unsub = () => {};
  getMessagingIfSupported().then((messaging) => {
    if (!messaging) return;
    const u = onMessage(messaging, (payload) => {
      handler({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data as Record<string, string> | undefined,
      });
    });
    unsub = u;
  });
  return () => unsub();
};
