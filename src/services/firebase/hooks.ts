/* eslint-disable @typescript-eslint/no-explicit-any */
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { runAction, runMutation, runQuery } from "@/services/firestore";
import type { FirebaseFunctionReference } from "./api";

const pathOf = (reference: FirebaseFunctionReference) => reference?.__firebasePath;

export function useFirebaseQuery<T = any>(reference: FirebaseFunctionReference, args?: any): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  const argsKey = JSON.stringify(args ?? {});
  useEffect(() => {
    let active = true;
    const queryArgs = argsKey === '"skip"' ? "skip" : JSON.parse(argsKey);
    const load = () => {
      if (!active || queryArgs === "skip") return;
      setValue(undefined);
      void runQuery(pathOf(reference), queryArgs ?? {})
        .then((result) => active && setValue(result as T))
        .catch(() => active && setValue(undefined));
    };
    const unsubscribe = onAuthStateChanged(auth, load);
    window.addEventListener("firebase-data-changed", load);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("firebase-data-changed", load);
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
