// Standalone Push Notifications Service Worker.
// Registered on-demand via usePushNotifications. Does NOT cache, does NOT
// intercept fetches, does NOT touch authentication or navigation.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const kind = data.kind || "default";
    const tag = data.tag || undefined;

    // Cancel notification: close any matching tag and exit silently.
    if (kind === "video-call-cancel") {
      event.waitUntil(
        self.registration.getNotifications({ tag }).then((notes) => {
          notes.forEach((n) => n.close());
        })
      );
      return;
    }

    const isCall = kind === "video-call";
    const title = data.title || "Aliv.iA";
    const options = {
      body: data.body || "",
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      data: { url: data.url || "/", kind, callId: data.call_id || null },
      tag,
      renotify: isCall, // re-alert if same tag is reissued
      requireInteraction: isCall, // keep call notification visible
      vibrate: isCall
        ? [400, 200, 400, 200, 400, 200, 400, 200, 400]
        : [200, 100, 200],
      actions: isCall
        ? [
            { action: "accept", title: "Atender" },
            { action: "reject", title: "Recusar" },
          ]
        : undefined,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error("Push event error:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/";
  const isCall = data.kind === "video-call";

  // "reject" action just closes; "accept" or default click opens the app.
  if (event.action === "reject") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if (isCall) {
            // Do NOT reload an open tab: it would destroy a call already
            // ringing there. Hand the call over via postMessage instead.
            client.postMessage({
              type: "notification-click",
              kind: data.kind,
              url,
              callId: data.callId || null,
            });
          } else {
            client.navigate(url);
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
