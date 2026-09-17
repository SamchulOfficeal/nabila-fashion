import { auth } from "@/lib/firebase";
import {
  friendlyAuthError,
  reloadAuthUser,
  sendPasswordReset,
  sendVerificationEmail,
  signInAsGuest,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from "@/services/firebase/auth";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

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
        // Best-effort verification email; never blocks account creation.
        try {
          await sendVerificationEmail(auth.currentUser);
        } catch {
          // The customer can resend from Account → Email verification.
        }
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

  /** Sends a password-reset email (used by the /auth forgot-password flow). */
  const requestPasswordReset = useCallback(
    async (email: string) => {
      await sendPasswordReset(email);
    },
    [],
  );

  /** Sends the verify-address email; resolves false when already verified. */
  const requestVerificationEmail = useCallback(async () => {
    return sendVerificationEmail(user);
  }, [user]);

  /** Re-reads the Firebase user after the customer clicks the verify link. */
  const refreshVerification = useCallback(async () => {
    return reloadAuthUser();
  }, []);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      /** Firebase-level flag; undefined for guest sessions. */
      emailVerified: user?.emailVerified,
      signIn,
      signOut,
      signInGoogle,
      requestPasswordReset,
      requestVerificationEmail,
      refreshVerification,
      authError: friendlyAuthError,
    }),
    [isAuthenticated, isLoading, user, requestPasswordReset, requestVerificationEmail, refreshVerification],
  );
}
