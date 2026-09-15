import { auth } from "@/lib/firebase";
import {
  friendlyAuthError,
  signInAsGuest,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from "@/services/firebase/auth";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAuthenticated = Boolean(user && !user.isAnonymous);

  const signIn = async (method: string, payload?: FormData | Record<string, unknown>) => {
    if (method === "anonymous") {
      await signInAsGuest();
      return;
    }

    if (method === "email-otp") {
      const formData = payload instanceof FormData ? payload : new FormData();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "").trim();
      const code = String(formData.get("code") ?? "").trim();

      if (!email) throw new Error("Email is required.");
      if (!code && !password) {
        throw new Error("Enter a password to continue.");
      }

      if (code) {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email === email) {
          return;
        }
        throw new Error("Firebase email OTP flow requires a configured custom auth flow.");
      }

      if (formData.get("mode") === "signUp") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      return;
    }

    throw new Error(`Unsupported auth method: ${method}`);
  };

  const signInGoogle = async () => signInWithGoogle();

  const signOut = async () => {
    await signOutUser();
  };

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      signIn,
      signOut,
      signInGoogle,
      authError: friendlyAuthError,
    }),
    [isAuthenticated, isLoading, user],
  );
}
