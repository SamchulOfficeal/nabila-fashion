import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyD3r2twpbf8LtBhtK6WAr4G7KUzOqiLIAU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "nabila-fashion.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "nabila-fashion",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "nabila-fashion.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "593947254956",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:593947254956:web:0dcaf5fff81a4de46c3f09",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Survive refreshes/tabs: without this some environments default to session
// (or in-memory) persistence and every reload signs the user out.
void setPersistence(auth, browserLocalPersistence).catch(() => undefined);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const firebaseAuth = {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut: () => signOut(auth),
};

export type FirebaseUser = User;

export const fs = {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
};

export const storageApi = {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};

export default firebaseApp;
