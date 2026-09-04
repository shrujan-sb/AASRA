"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Site } from "@/components/site/Site";
import { useAuth } from "@/lib/auth";

export function HomeView() {
  const { session, ready, firebaseReady, authError, signInGoogle, logout } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !session || busy) return;
    if (session.role === "admin" && firebaseReady && session.mode !== "firebase") return;
    router.replace(session.role === "support" ? "/support" : "/console");
  }, [ready, session, router, busy, firebaseReady]);

  async function enterAdmin() {
    setErr("");
    setBusy(true);
    try {
      await logout();
      if (!firebaseReady) {
        setErr("Google sign-in is required for the admin portal.");
        return;
      }
      await signInGoogle("admin");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Site>
      <section className="border-b border-[var(--ink)]">
        <div className="site-wrap grid w-full items-start gap-14 py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
          <div className="lg:col-span-7 lg:pt-4">
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">Relief mesh</p>
            <h1 className="mt-4 max-w-[15ch] text-[40px] font-semibold leading-[1.15] tracking-[-0.028em] sm:text-[48px]">
              Name the place. The desk ranks the need.
            </h1>
            <p className="mt-5 max-w-[38ch] text-[17px] leading-[1.6] text-[var(--mute)]">
              Aasra is the public door to a flood-sector control room. Send a location in your own words. Field teams wait
              behind an ID check. Officers see one queue, not fifty WhatsApp threads.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/report" className="site-btn site-btn-ink">
                Report help
              </Link>
              <Link href="/how-it-works" className="site-btn site-btn-paper">
                See the pipeline
              </Link>
            </div>
          </div>

          <aside id="desk" className="lg:col-span-5">
            <div className="border border-[var(--ink)] bg-white">
              <div className="flex items-baseline justify-between border-b border-[var(--ink)] px-5 py-3">
                <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Duty board</p>
                <Clock />
              </div>
              <div className="px-5 py-5">
                <p className="text-[15px] leading-relaxed text-[var(--mute)]">
                  Public reports need no login. Support and admin wait on Google after the desk allows you.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link href="/report" className="site-btn site-btn-ink w-full">
                    Report help
                  </Link>
                  <Link href="/join" className="site-btn site-btn-paper w-full">
                    Support team
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void enterAdmin()}
                    className="site-btn site-btn-paper w-full disabled:opacity-50"
                  >
                    {busy ? "Waiting for Google…" : "Admin portal"}
                  </button>
                </div>
                {(err || authError) && <p className="mt-3 text-[14px] text-[var(--crit)]">{err || authError}</p>}
              </div>
              <ul className="border-t border-[var(--ink)] text-[13px]">
                <li className="flex justify-between gap-4 border-b border-[var(--rule)] px-5 py-2.5">
                  <span>Autonagar bund · boat</span>
                  <span className="text-[var(--mute)]">queued</span>
                </li>
                <li className="flex justify-between gap-4 border-b border-[var(--rule)] px-5 py-2.5">
                  <span>Pedakakani · camp</span>
                  <span className="text-[var(--mute)]">assigned</span>
                </li>
                <li className="flex justify-between gap-4 px-5 py-2.5">
                  <span>Tenali market · blankets</span>
                  <span className="text-[var(--mute)]">verified</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-[var(--ink)] bg-[var(--paper)]">
        <div className="site-wrap grid gap-10 py-14 md:grid-cols-3">
          {[
            {
              k: "Prepare",
              t: "Intake before rumour",
              d: "A report is a place, a need, and an optional name. The intake agent turns that sentence into a ticket the map can hold.",
            },
            {
              k: "Respond",
              t: "Rank, then roll",
              d: "Priority is policy, not whoever shouted last. Routing assigns boats, medics, and stores against what is still free.",
            },
            {
              k: "Rebuild",
              t: "Leave a sitrep",
              d: "Knock-on hazards stay on the same board. The summary agent keeps one page officers can read at shift change.",
            },
          ].map((col) => (
            <article key={col.k}>
              <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">{col.k}</p>
              <h2 className="mt-2 text-[22px] font-semibold">{col.t}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--mute)]">{col.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b border-[var(--ink)]">
        <div className="site-wrap grid gap-12 py-14 lg:grid-cols-2">
          <div>
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">Who this is for</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Households, uniforms, and registered crews</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[var(--mute)]">
              If you need water, a boat, or a dry floor, write the landmark yourself — we do not trap you in a ward list.
              If you are government or NGO, you photograph the card first. Admins allow or reject from Approvals. Mail goes
              out from aasra.support@gmail.com.
            </p>
            <Link href="/about" className="mt-6 inline-block font-medium underline underline-offset-4">
              Read about the mesh
            </Link>
          </div>
          <div className="border border-[var(--ink)] bg-white">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-[var(--ink)] text-[13px] uppercase tracking-[0.12em] text-[var(--mute)]">
                  <th className="px-4 py-3 font-medium">Desk fact</th>
                  <th className="px-4 py-3 font-medium">This build</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Agents in the pipe", "Five — intake to sitrep"],
                  ["Public report login", "None"],
                  ["Support desk", "Approved Gmail only"],
                  ["Admin desk", "Allow-listed Google"],
                  ["Demo tickets", "Button on Report help"],
                ].map(([a, b]) => (
                  <tr key={a} className="border-b border-[var(--rule)] last:border-0">
                    <td className="px-4 py-3">{a}</td>
                    <td className="px-4 py-3 text-[var(--mute)]">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </Site>
  );
}

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning className="font-medium tabular-nums">{t || "—"}</span>;
}
