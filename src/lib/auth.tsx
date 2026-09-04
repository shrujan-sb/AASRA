"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth, googleProvider } from "@/lib/firebase";
import { ensureSeedAdmin, isAdminEmail, SEED_ADMIN } from "@/lib/admins";
import { checkApprovedSupport } from "@/lib/support";

export type Role = "admin" | "support";

export type Session = {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  mode: "firebase" | "local";
  role: Role;
};

type AuthCtx = {
  session: Session | null;
  ready: boolean;
  firebaseReady: boolean;
  authError: string;
  signInGoogle: (role: Role) => Promise<void>;
  signInLocal: (role: Role) => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const SESSION_KEY = "aasra-session";
const ROLE_KEY = "aasra-role-intent";

function withRole(user: User, role: Role): Session {
  return {
    uid: user.uid,
    name: user.displayName ?? (role === "admin" ? "Admin" : "Support"),
    email: user.email ?? "",
    photo: user.photoURL ?? undefined,
    mode: "firebase",
    role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const firebaseReady = firebaseEnabled();

  useEffect(() => {
    void ensureSeedAdmin();
    const auth = getFirebaseAuth();
    const storedRole = () => (localStorage.getItem(ROLE_KEY) as Role | null) ?? "admin";

    if (auth) {
      return onAuthStateChanged(auth, (user: User | null) => {
        void (async () => {
          await ensureSeedAdmin();
          if (user) {
            const local = localStorage.getItem(SESSION_KEY);
            const prev = local ? (JSON.parse(local) as Session) : null;
            const role = prev?.uid === user.uid ? prev.role : storedRole();
            if (role === "admin" && !isAdminEmail(user.email)) {
              await signOut(auth);
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
              setAuthError("You aren't authorized as an admin");
              setReady(true);
              return;
            }
            if (role === "support" && !(await checkApprovedSupport(user.email))) {
              await signOut(auth);
              localStorage.removeItem(SESSION_KEY);
              setSession(null);
              setAuthError("You aren't approved as support yet. Submit an application first.");
              setReady(true);
              return;
            }
            const next = withRole(user, role);
            localStorage.setItem(SESSION_KEY, JSON.stringify(next));
            setSession(next);
          } else {
            localStorage.removeItem(SESSION_KEY);
            setSession(null);
          }
          setReady(true);
        })();
      });
    }
    const local = localStorage.getItem(SESSION_KEY);
    setSession(local ? (JSON.parse(local) as Session) : null);
    setReady(true);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      ready,
      firebaseReady,
      authError,
      signInGoogle: async (role) => {
        setAuthError("");
        localStorage.setItem(ROLE_KEY, role);
        await ensureSeedAdmin();
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase Auth is not configured");
        const cred = await signInWithPopup(auth, googleProvider);
        if (role === "admin" && !isAdminEmail(cred.user.email)) {
          await signOut(auth);
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
          const msg = "You aren't authorized as an admin";
          setAuthError(msg);
          throw new Error(msg);
        }
        if (role === "support" && !(await checkApprovedSupport(cred.user.email))) {
          await signOut(auth);
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
          const msg = "You aren't approved as support yet. Submit an application first.";
          setAuthError(msg);
          throw new Error(msg);
        }
        const next = withRole(cred.user, role);
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setSession(next);
      },
      signInLocal: (role) => {
        setAuthError("");
        const s: Session = {
          uid: role === "admin" ? "admin-local" : "support-local",
          name: role === "admin" ? "Admin" : "Support",
          email: role === "admin" ? SEED_ADMIN : "support@aasra.local",
          mode: "local",
          role,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSession(s);
      },
      logout: async () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ROLE_KEY);
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
        setSession(null);
      },
    }),
    [session, ready, firebaseReady, authError],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
