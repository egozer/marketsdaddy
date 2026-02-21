import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyA6R5p4PFhKz8yWmtWZdjpCNID_CXJQ1OE",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "egeblackbird1.firebaseapp.com",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    "https://egeblackbird1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "egeblackbird1",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "egeblackbird1.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "335231975480",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:335231975480:web:b840c88bcd674ce33de6cd"
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

function ensureFirebaseConfig() {
  if (missingConfig.length > 0) {
    throw new Error(
      `Missing Firebase env vars: ${missingConfig.join(", ")}. Check your environment configuration.`
    );
  }
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Database | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getFirebaseApp(): FirebaseApp {
  ensureFirebaseConfig();
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (!isBrowser()) {
    return null;
  }
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseDatabase(): Database | null {
  if (!isBrowser()) {
    return null;
  }
  if (!dbInstance) {
    dbInstance = getDatabase(getFirebaseApp());
  }
  return dbInstance;
}

export function getGoogleProvider(): GoogleAuthProvider | null {
  if (!isBrowser()) {
    return null;
  }
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
  }
  return googleProviderInstance;
}
