import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

if ((inIframe || isPreviewHost) && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
