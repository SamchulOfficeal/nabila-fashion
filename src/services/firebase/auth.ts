import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { runQuery } from "@/services/firestore";

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

/** Sends the Firebase password-reset email. The link returns to /auth. */
export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/auth`,
    handleCodeInApp: false,
  });
}

/** Sends the verify-address email for the current user. Returns false when already verified. */
export async function sendVerificationEmail(user?: User | null): Promise<boolean> {
  const target = user ?? auth.currentUser;
  if (!target || !target.email) throw new Error("Sign in with an email account first.");
  if (target.emailVerified) return false;
  await sendEmailVerification(target, {
    url: `${window.location.origin}/account`,
  });
  return true;
}

/** Re-reads the Firebase user so `emailVerified` updates after the link is clicked. */
export async function reloadAuthUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export function friendlyAuthError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) {
    return "Email or password is incorrect. Use Sign up for a new account.";
  }
  if (code.includes("auth/email-already-in-use")) return "This email already has an account. Use Sign in.";
  if (code.includes("auth/weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("auth/popup-blocked")) return "Your browser blocked the Google sign-in popup.";
  if (code.includes("auth/operation-not-allowed")) return "This sign-in method is not enabled in Firebase Authentication.";
  if (code.includes("auth/user-not-found")) return "No account uses this email address. Use Sign up to create one.";
  if (code.includes("auth/invalid-email")) return "That email address looks incomplete — check it and try again.";
  if (code.includes("auth/too-many-requests")) return "Too many attempts. Please wait a few minutes and try again.";
  if (code.includes("auth/network-request-failed")) return "Network problem — check your connection and try again.";
  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
}

export function signInAsGuest() {
  return signInAnonymously(auth);
}

export function signOutUser() {
  return signOut(auth);
}

export function currentUser(): User | null {
  return auth.currentUser;
}

export function getProfile<T = Record<string, unknown>>() {
  return runQuery("profile.get") as Promise<T | null | undefined>;
}
