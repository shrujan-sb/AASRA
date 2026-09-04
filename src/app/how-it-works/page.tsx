import type { Metadata } from "next";
import Link from "next/link";
import { Site } from "@/components/site/Site";

export const metadata: Metadata = {
  title: "How it works — Aasra",
  description: "How a public report becomes a ranked assignment.",
};

const STEPS = [
  {
    n: "01",
    t: "Intake",
    d: "A free-text location and a need become a structured event. Optional name is stored with the ticket, not required.",
  },
  {
    n: "02",
    t: "Verification",
    d: "Conflicting reports on the same patch are tagged so officers are not sent twice for one rooftop.",
  },
  {
    n: "03",
    t: "Prioritisation",
    d: "The clerk sets severity and score. Life-safety beats blankets. Heuristics fill in only if the clerk is offline.",
  },
  {
    n: "04",
    t: "Routing",
    d: "Nearest approved government, NGO, or volunteer from their registered area. Help claims the ticket; the clerk can hold a bad claim.",
  },
  {
    n: "05",
    t: "Summary",
    d: "A sitrep compiles what is still open, what moved, and what knock-on hazards remain.",
  },
];

export default function HowPage() {
  return (
    <Site>
      <article className="site-wrap py-14">
        <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Pipeline</p>
        <h1 className="mt-3 max-w-[20ch] text-[36px] font-semibold tracking-tight">Clerk, then the board</h1>
        <p className="mt-5 max-w-[60ch] text-[18px] leading-relaxed text-[var(--mute)]">
          The duty clerk reads every public report, ranks it, and points the nearest desk. Officers do not chat with a
          model. Each step still leaves a log line you can watch from Messages to Needs to Teams.
        </p>
        <ol className="mt-12 divide-y divide-[var(--ink)] border-y border-[var(--ink)]">
          {STEPS.map((s) => (
            <li key={s.n} className="grid gap-2 py-6 sm:grid-cols-[88px_1fr] sm:gap-8">
              <p className="text-[13px] tracking-[0.16em] text-[var(--mute)]">{s.n}</p>
              <div>
                <h2 className="text-[22px] font-semibold">{s.t}</h2>
                <p className="mt-2 max-w-[58ch] text-[16px] leading-relaxed text-[var(--mute)]">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/report" className="site-btn site-btn-ink">
            File a report
          </Link>
          <Link href="/join" className="site-btn site-btn-paper">
            Apply as support
          </Link>
        </div>
      </article>
    </Site>
  );
}
