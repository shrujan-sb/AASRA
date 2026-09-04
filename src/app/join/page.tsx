"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Site } from "@/components/site/Site";

export default function JoinPage() {
  const router = useRouter();
  const { firebaseReady, signInGoogle, logout, authError } = useAuth();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function alreadyApproved() {
    setErr("");
    setBusy(true);
    try {
      await logout();
      if (!firebaseReady) {
        setErr("Google sign-in is required after you are approved.");
        return;
      }
      await signInGoogle("support");
      router.replace("/support");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Site>
      <div className="site-wrap max-w-[560px] py-12">
        <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Field access</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Support team</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[var(--mute)]">
          Verify first. After an admin allows you, sign in with the same Gmail. Until then the support desk stays closed.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Link href="/join/government" className="site-btn site-btn-paper w-full justify-start">
            Government officials
          </Link>
          <Link href="/join/ngo" className="site-btn site-btn-paper w-full justify-start">
            Authorized NGOs and volunteers
          </Link>
          <button
            type="button"
            disabled={busy}
            className="site-btn site-btn-ink mt-2 w-full justify-start disabled:opacity-50"
            onClick={() => void alreadyApproved()}
          >
            {busy ? "Waiting for Google…" : "I am already approved — sign in"}
          </button>
        </div>
        {(err || authError) && <p className="mt-4 text-[var(--crit)]">{err || authError}</p>}
      </div>
    </Site>
  );
}
