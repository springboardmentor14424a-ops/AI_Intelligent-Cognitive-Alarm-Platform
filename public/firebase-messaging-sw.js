// Background push handler for BrainOS. Registered with the Firebase config
// passed as a query string (see src/notifications/push.js) since Vite serves
// this file as a static asset and cannot inject build-time env vars into it.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
const config = JSON.parse(params.get("config") || "{}");

if (config.apiKey) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    self.registration.showNotification(title || "BrainOS", {
      body: body || "You have a new update.",
      icon: "/favicon.ico",
      data: payload.data || {},
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
