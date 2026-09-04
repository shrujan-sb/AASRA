"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { session, ready, firebaseReady, signInGoogle, signInDuty } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/console");
  }, [ready, session, router]);

  if (!ready) {
    return <div className="p-10 text-xl">Opening the desk…</div>;
  }

  return (
    <main className="min-h-full grid md:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between p-10 md:p-16 border-b md:border-b-0 md:border-r border-[var(--rule)]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Aasra" className="h-20 w-20 object-contain mix-blend-multiply" />
          <p className="mt-10 text-lg text-[var(--mute)]">Krishna basin flood desk</p>
          <h1 className="mt-3 text-5xl md:text-7xl font-semibold leading-[0.95] tracking-tight">
            Sign in to
            <br />
            run the <span className="mark text-[var(--crit)] text-6xl md:text-8xl align-baseline">live</span> sector.
          </h1>
          <p className="mt-8 max-w-md text-lg text-[var(--mute)]">
            Duty officers only. Incoming requests, offers, and road reports get parsed, verified, ranked, and assigned in this room.
          </p>
        </div>
        <div className="mt-12 flex flex-col gap-4 max-w-md">
          <button
            type="button"
            disabled={!firebaseReady}
            onClick={() =>
              void signInGoogle().catch((e: unknown) => setErr(e instanceof Error ? e.message : "Google sign-in failed"))
            }
            className="h-14 bg-[var(--ink)] text-[var(--paper)] px-6 text-lg font-medium disabled:opacity-40"
          >
            Continue with Google
          </button>
          <button type="button" onClick={signInDuty} className="h-14 border-2 border-[var(--ink)] px-6 text-lg font-medium">
            Open local duty desk
          </button>
          {!firebaseReady && (
            <p className="text-base text-[var(--warn)]">Firebase keys are not loaded. Use the local desk for the demo.</p>
          )}
          {err && <p className="text-base text-[var(--crit)]">{err}</p>}
          <p className="text-base text-[var(--mute)]">Prepare · Respond · Rebuild</p>
        </div>
      </section>
      <section className="bg-[var(--paper-2)] flex items-center justify-center p-10 min-h-[40vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Aasra" className="max-h-[72vh] w-auto object-contain" />
      </section>
    </main>
  );
}
