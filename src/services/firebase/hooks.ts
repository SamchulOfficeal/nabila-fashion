/* eslint-disable @typescript-eslint/no-explicit-any */
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { runAction, runMutation, runQuery } from "@/services/firestore";
import type { FirebaseFunctionReference } from "./api";

const pathOf = (reference: FirebaseFunctionReference) => reference?.__firebasePath;

/**
 * Hydration cache — the fix for "page loads slow / shows blank until I
 * refresh". The last good result of every query is kept in memory AND in
 * sessionStorage, so when a page mounts (route change or a fresh reload) it
 * instantly paints with the previous data while a background refetch brings
 * in fresh rows. Without this, every mount started at `undefined` and the
 * whole page waited on the Firestore network round-trip.
 */
const HYDRATION_CACHE = new Map<string, unknown>();
const CACHE_PREFIX = "nabila:q:";

function readHydration(key: string): unknown {
  if (HYDRATION_CACHE.has(key)) return HYDRATION_CACHE.get(key);
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (raw === null) return undefined;
    const value = JSON.parse(raw);
    HYDRATION_CACHE.set(key, value);
    return value;
  } catch {
    return undefined; // private mode / storage full / parse failure
  }
}

function writeHydration(key: string, value: unknown) {
  if (value === undefined) return;
  HYDRATION_CACHE.set(key, value);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — memory cache still works, so ignore.
  }
}

/**
 * Firestore-backed query hook.
 *
 * - Keeps the previous value while refetching, so the UI never flashes back
 *   into a loading state (cart quantity clicks no longer reload the page).
 * - Coalesces bursts of refetch triggers (auth changes, mutation events)
 *   into a single request.
 * - Ignores out-of-order responses so a slow stale fetch can never overwrite
 *   newer data from a rapid +/- click.
 */
export function useFirebaseQuery<T = any>(
  reference: FirebaseFunctionReference,
  args?: any,
): T | undefined {
  const argsKey = JSON.stringify(args ?? {});
  const [value, setValue] = useState<T | undefined>(
    () => readHydration(`${pathOf(reference)}:${argsKey}`) as T | undefined,
  );
  const timer = useRef<number | null>(null);
  const valueRef = useRef<T | undefined>(undefined);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let active = true;
    let lastStarted = 0;
    const queryArgs = argsKey === '"skip"' ? "skip" : JSON.parse(argsKey);
    const cacheKey = `${pathOf(reference)}:${argsKey}`;

    const fetchNow = () => {
      if (!active || queryArgs === "skip") return;
      const request = ++lastStarted;
      void runQuery(pathOf(reference), queryArgs ?? {})
        .then((result) => {
          if (!active || request !== lastStarted) return; // stale response
          valueRef.current = result as T;
          setValue(result as T);
          writeHydration(cacheKey, result);
        })
        .catch(() => {
          if (!active || request !== lastStarted) return;
          // Keep the previously loaded data on refetch errors; only surface
          // undefined when nothing has loaded yet.
          if (valueRef.current === undefined) setValue(undefined);
        });
    };

    const schedule = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      // Small delay lets the Firestore SDK flush the local write that
      // triggered the refetch, so we read post-mutation data.
      timer.current = window.setTimeout(fetchNow, 60);
    };

    schedule();
    const unsubscribe = onAuthStateChanged(auth, schedule);
    window.addEventListener("firebase-data-changed", schedule);
    return () => {
      active = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
      unsubscribe();
      window.removeEventListener("firebase-data-changed", schedule);
    };
  }, [reference, argsKey]);

  return value;
}

export function useFirebaseMutation<T = any, A = any>(reference: FirebaseFunctionReference) {
  return async (args?: A) => {
    const result = await runMutation(pathOf(reference), args ?? {});
    window.dispatchEvent(new Event("firebase-data-changed"));
    return result as T;
  };
}

export function useFirebaseAction<T = any, A = any>(reference: FirebaseFunctionReference) {
  return async (args?: A) => {
    const result = await runAction(pathOf(reference), args ?? {});
    window.dispatchEvent(new Event("firebase-data-changed"));
    return result as T;
  };
}

export const useQuery = useFirebaseQuery;
export const useMutation = useFirebaseMutation;
export const useAction = useFirebaseAction;
