// Firebase app + Cloud Messaging init. Safe to import even when no Firebase
// project is configured: `messagingSupported()` reports false and every
// caller in src/notifications/push.js short-circuits before touching Firebase.
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

export function getFirebaseApp() {
  if (!firebaseConfigured) return null;
  return getApps()[0] || initializeApp(firebaseConfig);
}
