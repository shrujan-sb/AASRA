"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { session, ready, firebaseReady, signInGoogle, signInDuty } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && session) router.replace("/console");
  }, [ready, session, router]);

  if (!ready) {
    return <div className="p-4 text-[12px] text-[var(--muted)]">BOOTING SECTOR DESK…</div>;
  }

  return (
    <main className="min-h-full flex items-stretch">
      <section className="w-[420px] max-w-full border-r border-[var(--line)] bg-[var(--bg-2)] p-6 flex flex-col gap-6">
        <header className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Aasra" className="h-14 w-14 object-contain" />
          <div>
            <div className="display text-xl tracking-[0.18em] text-[#8ec4e8]">AASRA</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">ReliefMesh · sector control</div>
          </div>
        </header>
        <div className="text-[11px] leading-5 text-[var(--muted)]">
          Restricted operations console. Authenticate as Disaster Control Officer.
          Pipeline writes incidents, events, resources, and assignments to Firestore when configured.
        </div>
        <button
          type="button"
          onClick={() => void signInGoogle().catch(() => undefined)}
          disabled={!firebaseReady}
          className="h-10 border border-[var(--info)] text-[var(--info)] px-3 text-left text-[12px] uppercase tracking-widest hover:bg-[#12324a] disabled:opacity-40"
        >
          Google sign-in — duty officer
        </button>
        {!firebaseReady && (
          <p className="text-[10px] text-[var(--high)]">
            Firebase env vars missing. Add keys in .env.local. Local duty desk is available for the demo.
          </p>
        )}
        <button
          type="button"
          onClick={signInDuty}
          className="h-9 border border-[var(--line)] px-3 text-left text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--text)]"
        >
          Assume local duty desk
        </button>
        <div className="mt-auto text-[10px] text-[var(--muted)]">
          PREPARE · RESPOND · REBUILD
          <div>Krishna basin flood sector · demo stream</div>
        </div>
      </section>
      <section className="flex-1 hidden md:flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Aasra mark" className="max-h-[70vh] object-contain opacity-90" />
      </section>
    </main>
  );
}
