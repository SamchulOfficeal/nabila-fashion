/**
 * FCM push notifications (Tier 2).
 * Background delivery while the site is closed requires:
 *  1. this module (token registration), and
 *  2. a Firebase Cloud Function that fans out pushes when a notification row
 *     is written (see functions/index.js in this repo).
 *
 * A VAPID key is required for web push. Set it in Firebase Console →
 * Project settings → Cloud Messaging → Web Push certificates, then add it
 * to Settings → Environment as VITE_FIREBASE_VAPID_KEY.
 */
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, firebaseApp } from "@/lib/firebase";

const SW_PATH = "/firebase-messaging-sw.js";
const TOKEN_KEY = "nabila:fcm:token";

let messagingInstance: Messaging | null = null;
let messagingTried = false;

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (messagingTried) return messagingInstance;
  messagingTried = true;
  try {
    if (!(await isSupported())) return null;
    messagingInstance = getMessaging(firebaseApp);
  } catch {
    messagingInstance = null;
  }
  return messagingInstance;
}

/** Registers the messaging service worker (idempotent). */
export async function registerMessagingWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    return true;
  } catch (error) {
    console.warn("[fcm] service worker registration failed", error);
    return false;
  }
}

/**
 * Requests/refreshes the FCM token and stores it in the `fcmTokens` collection.
 * Returns the token, or null when push is unavailable (no VAPID key,
 * unsupported browser, or permission denied).
 */
export async function registerPushToken(role: "staff" | "customer"): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) {
    console.warn("[fcm] VITE_FIREBASE_VAPID_KEY not set — background push disabled");
    return null;
  }

  const workerReady = await registerMessagingWorker();
  if (!workerReady) return null;

  try {
    const currentRegistration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: currentRegistration,
    });
    if (!token) return null;

    // Upsert locally so we only write when the token changes.
    if (localStorage.getItem(TOKEN_KEY) === token) return token;
    localStorage.setItem(TOKEN_KEY, token);

    // Replace any previous rows for this user with the fresh token.
    const existing = await getDocs(
      query(collection(db, "fcmTokens"), where("userId", "==", user.uid)),
    );
    if (!existing.empty) {
      await updateDoc(existing.docs[0].ref, { token, role, updatedAt: Date.now() });
    } else {
      await addDoc(collection(db, "fcmTokens"), {
        userId: user.uid,
        role,
        token,
        userAgent: navigator.userAgent.slice(0, 200),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return token;
  } catch (error) {
    console.warn("[fcm] token registration failed", error);
    return null;
  }
}

/** Removes the stored token row (used on sign-out). Best-effort. */
export async function unregisterPushToken(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  localStorage.removeItem(TOKEN_KEY);
  try {
    const existing = await getDocs(
      query(collection(db, "fcmTokens"), where("userId", "==", user.uid), limit(5)),
    );
    await Promise.all(existing.docs.map((row) => deleteDoc(row.ref)));
  } catch {
    // Ignore — rules may forbid listing other users' tokens; that is fine.
  }
}

/** Tiny helper so other modules can reference the collection path safely. */
export const fcmTokensRef = () => doc(collection(db, "fcmTokens"));
