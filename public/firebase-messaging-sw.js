/* Firebase Cloud Messaging service worker for NABILA FASHION.
 * Receives push messages while the site is closed (background delivery).
 * Firebase web config is public by design (same values ship in the JS bundle),
 * so it is inlined here — the SDK is loaded from the CDN, no bundler needed.
 */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD3r2twpbf8LtBhtK6WAr4G7KUzOqiLIAU",
  authDomain: "nabila-fashion.firebaseapp.com",
  projectId: "nabila-fashion",
  storageBucket: "nabila-fashion.firebasestorage.app",
  messagingSenderId: "593947254956",
  appId: "1:593947254956:web:0dcaf5fff81a4de46c3f09",
});

try {
  const messaging = firebase.messaging();

  // Background push (site closed / tab hidden).
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data ?? payload.notification ?? {};
    const title = data.title || "NABILA FASHION";
    const body = data.body || "You have a new update.";
    const url = data.url || "/orders";
    self.registration.showNotification(title, {
      body,
      icon: data.icon || "/auravelle-mark.svg",
      badge: data.icon || "/auravelle-mark.svg",
      tag: data.tag || "nabila-update",
      data: { url },
    });
  });
} catch (error) {
  // Messaging unsupported in this browser — ignore.
  console.warn("[fcm-sw] messaging unavailable", error);
}

// Clicking a notification opens the deep-linked page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
