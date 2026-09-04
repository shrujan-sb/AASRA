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
      <div className="site-wrap py-12 lg:py-16">
        <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Application desk</p>
        <h1 className="mt-3 max-w-[16ch] text-[36px] font-semibold tracking-tight">Support team</h1>
        <p className="mt-3 max-w-[58ch] text-[17px] leading-relaxed text-[var(--mute)]">
          Two files. Pick the one that matches your posting. Photograph the card, name the area you cover, wait for the
          stamp. After a pass, sign in with that same Gmail.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Link href="/join/government" className="desk-file block hover:bg-[var(--paper)]">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">File 01</span>
              <span className="text-[13px] text-[var(--mute)]">ID photo required</span>
            </div>
            <div className="px-5 py-5">
              <h2 className="text-[22px] font-semibold">Government officials</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--mute)]">
                Department, designation, employee number, posting area from the five suggestions.
              </p>
              <p className="mt-5 text-[14px] font-medium">Open this file →</p>
            </div>
          </Link>

          <Link href="/join/ngo" className="desk-file block hover:bg-[var(--paper)]">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">File 02</span>
              <span className="text-[13px] text-[var(--mute)]">Org letter or volunteer card</span>
            </div>
            <div className="px-5 py-5">
              <h2 className="text-[22px] font-semibold">NGOs and volunteers</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--mute)]">
                Organisation name, role, registration, the mandal or town you cover, why you are deploying.
              </p>
              <p className="mt-5 text-[14px] font-medium">Open this file →</p>
            </div>
          </Link>
        </div>

        <div className="desk-file mt-4">
          <div className="desk-file-head">
            <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Already stamped</span>
            <span className="text-[13px] text-[var(--mute)]">Same Gmail as the application</span>
          </div>
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-[var(--mute)]">
              Admin allowed you, or the clerk auto-stamped a clean file. This is not a public login.
            </p>
            <button
              type="button"
              disabled={busy}
              className="site-btn site-btn-ink shrink-0 disabled:opacity-50"
              onClick={() => void alreadyApproved()}
            >
              {busy ? "Waiting for Google…" : "I am already approved — sign in"}
            </button>
          </div>
        </div>
        {(err || authError) && <p className="mt-4 text-[var(--crit)]">{err || authError}</p>}
      </div>
    </Site>
  );
}
