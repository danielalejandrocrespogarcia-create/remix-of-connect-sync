/* Firebase Cloud Messaging – background handler
 * Served from the site root so its scope covers the whole app.
 * Uses the compat builds because service workers can't use ES modules reliably across browsers. */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDE4uzYZP-rGnxEsRwzTC3taETBrNqdHQc",
  authDomain: "upt-7786c.firebaseapp.com",
  projectId: "upt-7786c",
  storageBucket: "upt-7786c.firebasestorage.app",
  messagingSenderId: "791369394725",
  appId: "1:791369394725:web:b7f177a47d9db302cd6dcc",
});

const messaging = firebase.messaging();

// Background notifications
messaging.onBackgroundMessage((payload) => {
  const title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    "UPT Aragua";
  const options = {
    body:
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data || {},
    tag: (payload.data && payload.data.tag) || "upt-notification",
  };
  self.registration.showNotification(title, options);
});

// Click → focus or open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Activate immediately on update
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
