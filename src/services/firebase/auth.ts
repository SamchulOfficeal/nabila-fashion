import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
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

export function friendlyAuthError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) {
    return "Email or password is incorrect. Use Sign up for a new account.";
  }
  if (code.includes("auth/email-already-in-use")) return "This email already has an account. Use Sign in.";
  if (code.includes("auth/weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("auth/popup-blocked")) return "Your browser blocked the Google sign-in popup.";
  if (code.includes("auth/operation-not-allowed")) return "This sign-in method is not enabled in Firebase Authentication.";
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
