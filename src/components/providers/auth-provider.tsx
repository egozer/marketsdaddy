"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { upsertUserProfile } from "@/lib/db";
import type { AppUserProfile } from "@/lib/types";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function requireAuthInstance(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is only available in the browser.");
  }
  return auth;
}

async function syncProfile(user: User) {
  const now = new Date().toISOString();

  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: now,
    updatedAt: now
  };

  await upsertUserProfile(profile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,
      registerWithEmail: async (email, password) => {
        setError(null);
        const auth = requireAuthInstance();
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await syncProfile(result.user);
      },
      loginWithEmail: async (email, password) => {
        setError(null);
        const auth = requireAuthInstance();
        const result = await signInWithEmailAndPassword(auth, email, password);
        await syncProfile(result.user);
      },
      loginWithGoogle: async () => {
        setError(null);
        const auth = requireAuthInstance();
        const googleProvider = getGoogleProvider();
        if (!googleProvider) {
          throw new Error("Google provider is only available in the browser.");
        }
        const result = await signInWithPopup(auth, googleProvider);
        await syncProfile(result.user);
      },
      logout: async () => {
        const auth = requireAuthInstance();
        await signOut(auth);
      }
    }),
    [error, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
