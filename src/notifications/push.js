// Registers the current device for Firebase Cloud Messaging push notifications
// and hands the resulting token to the backend. No-ops safely whenever
// Firebase isn't configured, the browser lacks push support, or permission
// is denied, so the rest of the app never depends on this succeeding.
import { firebaseConfigured, firebaseVapidKey, getFirebaseApp } from "../firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function serviceWorkerUrl() {
  // vite serves public/ files as-is (no env injection), so the service worker
  // reads its Firebase config from the query string instead.
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  return `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(config))}`;
}

export async function enablePushNotifications() {
  if (!firebaseConfigured) return false;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const app = getFirebaseApp();
    if (!app) return false;

    const registration = await navigator.serviceWorker.register(serviceWorkerUrl());
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return false;

    const response = await fetch(`${API}/notifications/device-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.localStorage.getItem("brainos_token") || ""}`,
      },
      body: JSON.stringify({ token, platform: "WEB" }),
    });
    return response.ok;
  } catch {
    // Push is a progressive enhancement; failures here must never disrupt the dashboard.
    return false;
  }
}
