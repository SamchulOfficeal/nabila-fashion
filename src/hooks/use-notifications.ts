import { subscribeNotifications } from "@/services/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type NotificationRow = {
  _id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: number;
};

/** Subtle two-tone WebAudio chime (~200ms). No audio asset, no dependency. */
export function playChime() {
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    gain.connect(ctx.destination);

    const first = ctx.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(880, ctx.currentTime);
    first.connect(gain);
    first.start();
    first.stop(ctx.currentTime + 0.1);

    const second = ctx.createOscillator();
    second.type = "sine";
    second.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.08);
    second.connect(gain);
    second.start(ctx.currentTime + 0.08);
    second.stop(ctx.currentTime + 0.2);

    window.setTimeout(() => void ctx.close().catch(() => undefined), 400);
  } catch {
    // Audio is best-effort; never surface an error to the user.
  }
}

/**
 * Real-time staff notification feed (admin bell).
 * Replaces polling with a Firestore onSnapshot subscription. The chime plays
 * only when a NEW unread staff notification arrives while the tab is open.
 */
export function useStaffNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const latestRef = { current: "" };
    let unsubSnapshot: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnapshot?.();
      unsubSnapshot = null;
      if (!user) {
        if (active) {
          setItems([]);
          setReady(true);
        }
        return;
      }
      unsubSnapshot = subscribeNotifications("staff", (rows) => {
        if (!active) return;
        setItems(rows as NotificationRow[]);
        setReady(true);
        const latest = rows.find((row) => !row.isRead);
        if (latest && latest._id !== latestRef.current) {
          const firstPass = latestRef.current === "";
          latestRef.current = latest._id;
          if (!firstPass && document.visibilityState === "visible") {
            playChime();
          }
        }
      });
    });
    return () => {
      active = false;
      unsubSnapshot?.();
      unsubAuth();
    };
  }, []);

  const unreadCount = useMemo(() => items.filter((row) => !row.isRead).length, [items]);

  const markAllRead = useCallback(async () => {
    const { runMutation } = await import("@/services/firestore");
    await runMutation("notifications.markAllRead", {});
  }, []);

  return { items, unreadCount, ready, markAllRead };
}

/**
 * Real-time customer order updates: subscribes to the customer's own
 * notifications and reports every NEW status change (toast handled by callers).
 */
export function useMyOrderUpdates(enabled: boolean) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const firstPass = useRef(true);
  const [latestChange, setLatestChange] = useState<NotificationRow | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let unsubSnapshot: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user: User | null) => {
      unsubSnapshot?.();
      unsubSnapshot = null;
      if (!user) {
        if (active) setItems([]);
        return;
      }      unsubSnapshot = subscribeNotifications("customer", (rows) => {
        if (!active) return;
        setItems(rows as NotificationRow[]);
        const fresh = rows.find(
          (row) => !row.isRead && !seen.current.has(row._id),
        );
        for (const row of rows) seen.current.add(row._id);
        // firstPass: on the very first snapshot after sign-in, chime is
        // skipped (browser autoplay policy) but a genuinely unread row that
        // arrived before this session still deserves a toast once.
        if (fresh && (document.visibilityState === "visible" || !firstPass.current)) {
          setLatestChange(fresh as NotificationRow);
        }
        firstPass.current = false;
      });
    });
    return () => {
      active = false;
      unsubSnapshot?.();
      unsubAuth();
    };
  }, [enabled]);

  const unreadCount = useMemo(() => items.filter((row) => !row.isRead).length, [items]);

  const markAllRead = useCallback(async () => {
    const { runMutation } = await import("@/services/firestore");
    await runMutation("notifications.markMyRead", {});
  }, []);

  const dismissChange = useCallback(() => setLatestChange(null), []);

  return { items, unreadCount, latestChange, markAllRead, dismissChange };
}

/** Browser Notification permission state + helpers (no FCM needed in Tier 1). */
export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? (Notification.permission as NotificationPermissionState)
      : "unsupported",
  );

  const request = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported" as const;
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermissionState);
    return result;
  }, []);

  const test = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return false;
    try {
      new Notification("NABILA FASHION", {
        body: "Test notification — order updates will look like this.",
        icon: "/auravelle-mark.svg",
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const showOrderUpdate = useCallback((title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      new Notification(title, { body, icon: "/auravelle-mark.svg" });
    } catch {
      // Swallow — the toast already showed the update.
    }
  }, []);

  return { permission, request, test, showOrderUpdate };
}

/** Convenience wrapper for the Orders page: toast + browser notification + chime. */
export function useOrderStatusAlerts(enabled: boolean) {
  const { latestChange, dismissChange } = useMyOrderUpdates(enabled);
  const { showOrderUpdate } = useBrowserNotifications();

  useEffect(() => {
    if (!latestChange) return;
    playChime();
    toast(latestChange.title, {
      description: latestChange.message,
      icon: "🔔",
    });
    showOrderUpdate(latestChange.title, latestChange.message);
    dismissChange();
  }, [latestChange, dismissChange, showOrderUpdate]);
}
