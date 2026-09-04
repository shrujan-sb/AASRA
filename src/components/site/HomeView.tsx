"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Site } from "@/components/site/Site";
import { useAuth } from "@/lib/auth";
import type { BeforeBrief } from "@/lib/types";

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
      <section className="border-b border-[var(--ink)] bg-[var(--paper)]">
        <div className="site-wrap flex flex-wrap items-baseline justify-between gap-3 py-3 text-[13px] text-[var(--mute)]">
          <p className="tracking-[0.16em] uppercase">Krishna delta edition</p>
          <p>Vijayawada · Guntur · Tenali</p>
          <p className="tabular-nums">
            <MastheadDate />
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]">
        <div className="site-wrap grid w-full items-start gap-14 py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
          <div className="lg:col-span-7 lg:pt-2">
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">Relief mesh · flood week</p>
            <h1 className="mt-4 max-w-[16ch] text-[40px] font-semibold leading-[1.12] tracking-[-0.028em] sm:text-[52px]">
              Name the place. The <span className="mark">clerk</span> ranks the need.
            </h1>
            <p className="mt-6 max-w-[48ch] text-[17px] leading-[1.65] text-[var(--mute)]">
              Aasra is the public door to a sector control room. A household writes a landmark and a need. A duty
              clerk — not a rumour thread — studies the sentence, sets severity, and points the nearest government
              desk, NGO, or volunteer. Officers see one queue.
            </p>
            <p className="mt-4 max-w-[48ch] text-[16px] leading-[1.65] text-[var(--mute)]">
              Three doors, in this order: report help with no account, apply as support with an ID photo, then the
              admin portal for people already on the allow-list. Google is only for the last two.
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
                  Pick the door that matches you. Do not sign in to file a public report.
                </p>
                <ol className="mt-4 space-y-3 text-[14px] leading-snug">
                  <li>
                    <span className="font-semibold">1 · Report help</span>
                    <span className="block text-[var(--mute)]">No login. Place, need, optional name. The clerk studies it.</span>
                  </li>
                  <li>
                    <span className="font-semibold">2 · Support team</span>
                    <span className="block text-[var(--mute)]">Government or NGO ID first. After a pass, Google with that Gmail.</span>
                  </li>
                  <li>
                    <span className="font-semibold">3 · Admin portal</span>
                    <span className="block text-[var(--mute)]">Allow-listed officers only. Google popup. Not for the public.</span>
                  </li>
                </ol>
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
                  <span className="text-[var(--mute)]">clerk · critical</span>
                </li>
                <li className="flex justify-between gap-4 border-b border-[var(--rule)] px-5 py-2.5">
                  <span>Pedakakani · camp</span>
                  <span className="text-[var(--mute)]">NGO helping</span>
                </li>
                <li className="flex justify-between gap-4 px-5 py-2.5">
                  <span>Tenali market · blankets</span>
                  <span className="text-[var(--mute)]">routine</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-[var(--ink)] bg-white">
        <div className="site-wrap grid gap-0 sm:grid-cols-4">
          {[
            { n: "01", k: "Public", d: "No Google to file" },
            { n: "02", k: "Clerk", d: "Ranks every sentence" },
            { n: "03", k: "Field", d: "Nearest desk claims Help" },
            { n: "04", k: "Command", d: "One sitrep, one queue" },
          ].map((c, i) => (
            <div
              key={c.k}
              className={`px-0 py-8 sm:px-6 ${i < 3 ? "sm:border-r border-[var(--ink)]" : ""} border-b sm:border-b-0 border-[var(--rule)]`}
            >
              <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">{c.n}</p>
              <p className="mt-2 text-[22px] font-semibold">{c.k}</p>
              <p className="mt-1 text-[15px] text-[var(--mute)]">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <PublicRiskStrip />

      <section className="border-b border-[var(--ink)] bg-[var(--paper)]">
        <div className="site-wrap py-14">
          <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">How login works</p>
          <h2 className="mt-2 max-w-[22ch] text-[28px] font-semibold tracking-tight">You only sign in if the desk already knows you</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {[
              {
                k: "Public",
                t: "No Google, no password",
                d: "Report help is a form. Type a place from the five suggestions or drop a pin. The ticket lands on Needs even if you close the tab. Demo report files a sample so you can watch the clerk.",
              },
              {
                k: "Field",
                t: "ID, then the same Gmail",
                d: "Support team is two tracks: government official, or NGO / volunteer. You name the area you cover. An admin — and the clerk — read the file. Mail comes from aasra.support@gmail.com. Then use I am already approved.",
              },
              {
                k: "Command",
                t: "Allow-list only",
                d: "Admin portal is not an open signup. If your Gmail is not on Keys, Google will bounce you. Seed officer is the address already in the desk. Reset seed is for the demo board, not for wiping people.",
              },
            ].map((col) => (
              <article key={col.k}>
                <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">{col.k}</p>
                <h3 className="mt-2 text-[22px] font-semibold">{col.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--mute)]">{col.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]">
        <div className="site-wrap grid gap-10 py-14 md:grid-cols-3">
          {[
            {
              k: "Prepare",
              t: "Intake before rumour",
              d: "A report is a place, a need, and an optional name. The clerk reads it, sets life-safety versus blankets, and writes the first moves.",
            },
            {
              k: "Respond",
              t: "Nearest desk, then Help",
              d: "Approved units sit on a map of their posting. A ticket routes to the nearest. Help claims the work; the button goes off for everyone else.",
            },
            {
              k: "Rebuild",
              t: "One sitrep",
              d: "Knock-on hazards stay on the same board. Officers do not hunt WhatsApp for who already rolled.",
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

      <section className="border-b border-[var(--ink)] bg-white">
        <div className="site-wrap grid gap-12 py-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">The sector</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Places the desk already knows</h2>
            <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed text-[var(--mute)]">
              Type a landmark, not a ward code. The form offers five suggestions and a pin. These names show up on
              Needs because that is where boats, camps, and markets actually sit this week.
            </p>
            <ul className="mt-8 border border-[var(--ink)]">
              {[
                ["Autonagar bund", "Boat, rooftop, canal road"],
                ["Pedakakani junction", "School camp, nurses, fever"],
                ["Tenali vegetable market", "Blankets, drinking water, first floors"],
                ["Guntur old town", "Power, pumps, elderly homes"],
                ["Vijayawada river front", "NH-16, hospital access, shelters"],
              ].map(([p, n]) => (
                <li key={p} className="flex flex-wrap justify-between gap-2 border-b border-[var(--rule)] last:border-0 px-4 py-3">
                  <span className="font-medium">{p}</span>
                  <span className="text-[14px] text-[var(--mute)]">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">This desk will not</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">No chatbot. No glass wall.</h2>
            <ul className="mt-6 divide-y divide-[var(--ink)] border-y border-[var(--ink)] text-[15px] leading-relaxed">
              <li className="py-3">You do not talk to the model. You send a place and a need.</li>
              <li className="py-3">You do not need an account to report. Login is a gate, not a funnel.</li>
              <li className="py-3">Help is one organisation at a time. The button goes off when someone takes it.</li>
              <li className="py-3">Mail is a desk chit from aasra.support@gmail.com, not a newsletter.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]">
        <div className="site-wrap grid gap-12 py-14 lg:grid-cols-2">
          <div>
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">The clerk</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">A named brain on every ticket</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[var(--mute)]">
              The duty clerk studies the report before it hits Needs: severity, score, risks, first actions, and which
              nearby organisation should see it first. When a unit presses Help, the clerk checks the claim. Support
              applications get a ruling on the papers. Heuristics still exist if the clerk is offline — they do not
              outrank a returned decision.
            </p>
            <p className="mt-4 text-[16px] leading-relaxed text-[var(--mute)]">
              This is a sector mesh for a flood week, not a product tour. The log line on the ticket is the ruling.
            </p>
          </div>
          <div>
            <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">Who this is for</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Households, uniforms, and registered crews</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[var(--mute)]">
              If you need water, a boat, or a dry floor, write the landmark yourself — we do not trap you in a ward
              list. If you are government or NGO, photograph the card and name your mandal. Admins still hold the stamp
              when the clerk is unsure.
            </p>
            <Link href="/about" className="mt-6 inline-block font-medium underline underline-offset-4">
              Read about the mesh
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)] bg-[var(--paper)]">
        <div className="site-wrap py-14">
          <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">Ask the desk</p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Questions we get on a flood week</h2>
          <dl className="mt-8 divide-y divide-[var(--ink)] border-y border-[var(--ink)]">
            {[
              [
                "Do I need Google to report?",
                "No. Report help is a public form. Close the tab after you send it. The ticket still sits on Needs.",
              ],
              [
                "When does Support get Google?",
                "After an admin allows your ID and area. Mail says you may sign in with that same Gmail. Until then, wait.",
              ],
              [
                "Who sees the admin portal?",
                "Only Gmails on Keys. If Google opens and you are not on the list, you stay on this page with a bounce line.",
              ],
              [
                "What does Help do?",
                "It claims the ticket for your organisation. Everyone else sees who is on it. The clerk can still hold a bad claim.",
              ],
            ].map(([q, a]) => (
              <div key={q} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] sm:gap-10">
                <dt className="font-semibold">{q}</dt>
                <dd className="text-[15px] leading-relaxed text-[var(--mute)]">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]">
        <div className="site-wrap py-14">
          <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">This build</p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Facts on the paper</h2>
          <div className="mt-8 border border-[var(--ink)] bg-white">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-[var(--ink)] text-[13px] uppercase tracking-[0.12em] text-[var(--mute)]">
                  <th className="px-4 py-3 font-medium">Desk fact</th>
                  <th className="px-4 py-3 font-medium">This build</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Public report login", "None"],
                  ["Support desk", "Approved Gmail after ID + area"],
                  ["Admin desk", "Allow-listed Google only"],
                  ["Clerk", "Studies reports, applications, Help claims"],
                  ["Nearest unit", "From the area you registered"],
                  ["Help button", "One org at a time; then it goes off"],
                  ["Mail", "aasra.support@gmail.com"],
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

function MastheadDate() {
  const [d, setD] = useState("");
  useEffect(() => {
    setD(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);
  return <span suppressHydrationWarning>{d || "Krishna delta"}</span>;
}

function PublicRiskStrip() {
  const [line, setLine] = useState("");

  useEffect(() => {
    let live = true;
    void fetch("/api/predict", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { brief?: BeforeBrief }) => {
        if (!live) return;
        const h = data.brief?.headline?.trim();
        if (h) setLine(h);
      })
      .catch(() => {
        /* public strip is optional */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!line) return null;

  return (
    <section className="border-b border-[var(--ink)] bg-white">
      <div className="site-wrap py-6">
        <p className="text-[13px] tracking-[0.16em] uppercase text-[var(--mute)]">Next 24–48 hours</p>
        <p className="mt-2 max-w-[62ch] text-[17px] leading-snug font-medium">{line}</p>
      </div>
    </section>
  );
}
