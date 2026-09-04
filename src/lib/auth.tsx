"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth, googleProvider } from "@/lib/firebase";

type Session = {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  mode: "firebase" | "local-duty";
};

type AuthCtx = {
  session: Session | null;
  ready: boolean;
  firebaseReady: boolean;
  signInGoogle: () => Promise<void>;
  signInDuty: () => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const DUTY_KEY = "aasra-duty-session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const firebaseReady = firebaseEnabled();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth) {
      return onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          setSession({
            uid: user.uid,
            name: user.displayName ?? "Officer",
            email: user.email ?? "",
            photo: user.photoURL ?? undefined,
            mode: "firebase",
          });
        } else {
          const local = localStorage.getItem(DUTY_KEY);
          setSession(local ? (JSON.parse(local) as Session) : null);
        }
        setReady(true);
      });
    }
    const local = localStorage.getItem(DUTY_KEY);
    setSession(local ? (JSON.parse(local) as Session) : null);
    setReady(true);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      ready,
      firebaseReady,
      signInGoogle: async () => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase Auth is not configured");
        await signInWithPopup(auth, googleProvider);
      },
      signInDuty: () => {
        const s: Session = {
          uid: "duty-local",
          name: "Duty Officer",
          email: "control@aasra.local",
          mode: "local-duty",
        };
        localStorage.setItem(DUTY_KEY, JSON.stringify(s));
        setSession(s);
      },
      logout: async () => {
        localStorage.removeItem(DUTY_KEY);
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
        setSession(null);
      },
    }),
    [session, ready, firebaseReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
