import type { Metadata } from "next";
import Link from "next/link";
import { Site } from "@/components/site/Site";

export const metadata: Metadata = {
  title: "About — Aasra",
  description: "What the Aasra relief mesh is, and what it is not.",
};

export default function AboutPage() {
  return (
    <Site>
      <article className="site-wrap max-w-[720px] py-14">
        <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">About</p>
        <h1 className="mt-3 text-[36px] font-semibold tracking-tight">A desk that keeps the flood in one place</h1>
        <p className="mt-5 text-[18px] leading-relaxed text-[var(--mute)]">
          Aasra (ReliefMesh) is a sector control room for a Krishna-delta flood drill. It is built so a public report, a
          verified crew, and an officer share the same tickets instead of three chat groups.
        </p>
        <h2 className="mt-10 text-[22px] font-semibold">What you will not find here</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
          This is not a donation marketplace, not a news site, and not a replacement for 112 or 108. The live feed on the
          officer board includes scripted demo traffic so a jury can see the agents move without waiting for a real storm.
        </p>
        <h2 className="mt-10 text-[22px] font-semibold">Who holds the keys</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
          Admins are an allow-list. Support accounts exist only after Approvals. Mail about those decisions is sent from
          aasra.support@gmail.com, with the Aasra mark and Poppins body copy.
        </p>
        <Link href="/contact" className="mt-10 inline-block font-medium underline underline-offset-4">
          Contact the desk
        </Link>
      </article>
    </Site>
  );
}
