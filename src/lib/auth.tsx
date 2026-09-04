"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth, googleProvider } from "@/lib/firebase";
import { checkAdminEmail, ensureSeedAdmin, SEED_ADMIN } from "@/lib/admins";
import { loadApprovedSupport } from "@/lib/support";
import type { SupportKind } from "@/lib/types";

export type Role = "admin" | "support";

export type Session = {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  mode: "firebase" | "local";
  role: Role;
  supportKind?: SupportKind;
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

function withRole(user: User, role: Role, supportKind?: SupportKind): Session {
  return {
    uid: user.uid,
    name: user.displayName ?? (role === "admin" ? "Admin" : "Support"),
    email: user.email ?? "",
    photo: user.photoURL ?? undefined,
    mode: "firebase",
    role,
    supportKind,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const firebaseReady = firebaseEnabled();

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        setSession(JSON.parse(stored) as Session);
      } catch {
        /* ignore */
      }
    }
    void ensureSeedAdmin();
    const auth = getFirebaseAuth();
    const storedRole = () => (localStorage.getItem(ROLE_KEY) as Role | null) ?? "admin";

    if (auth) {
      return onAuthStateChanged(auth, (user: User | null) => {
        void (async () => {
          if (user) {
            const local = localStorage.getItem(SESSION_KEY);
            const prev = local ? (JSON.parse(local) as Session) : null;
            const role = prev?.uid === user.uid ? prev.role : storedRole();
            if (role === "admin" && !(await checkAdminEmail(user.email))) {
              setAuthError("You aren't authorized as an admin");
              setReady(true);
              return;
            }
            let supportKind: SupportKind | undefined = prev?.supportKind;
            if (role === "support") {
              const profile = await loadApprovedSupport(user.email);
              if (!profile) {
                setAuthError("You aren't approved as support yet. Submit an application first.");
                setReady(true);
                return;
              }
              supportKind = profile.kind;
            }
            const next = withRole(user, role, supportKind);
            localStorage.setItem(SESSION_KEY, JSON.stringify(next));
            setSession(next);
          }
          setReady(true);
        })();
      });
    }
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
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase Auth is not configured");
        const cred = await signInWithPopup(auth, googleProvider);
        if (role === "admin" && !(await checkAdminEmail(cred.user.email))) {
          await signOut(auth);
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
          const msg = "You aren't authorized as an admin";
          setAuthError(msg);
          throw new Error(msg);
        }
        let supportKind: SupportKind | undefined;
        if (role === "support") {
          const profile = await loadApprovedSupport(cred.user.email);
          if (!profile) {
            await signOut(auth);
            localStorage.removeItem(SESSION_KEY);
            setSession(null);
            const msg = "You aren't approved as support yet. Submit an application first.";
            setAuthError(msg);
            throw new Error(msg);
          }
          supportKind = profile.kind;
        }
        const next = withRole(cred.user, role, supportKind);
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
