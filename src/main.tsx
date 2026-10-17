import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isCapacitorApp } from "@/lib/platform";

// Clean up any previously-registered service workers when running inside
// the Lovable preview iframe — they cause stale caches and break HMR.
const inIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isCapacitorApp) {
  // Native Android/iOS app: no service worker needed.
} else if ((inIframe || isPreviewHost) && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
} else if ("serviceWorker" in navigator) {
  // Production: register the FCM service worker eagerly so PWA tooling
  // (PWABuilder, Lighthouse) can detect it without waiting for auth.
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .catch((err) => console.warn("[SW] register failed", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
