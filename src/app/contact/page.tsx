import type { Metadata } from "next";
import { Site } from "@/components/site/Site";

export const metadata: Metadata = {
  title: "Contact — Aasra",
  description: "How to reach the Aasra desk.",
};

export default function ContactPage() {
  return (
    <Site>
      <article className="site-wrap grid gap-12 py-14 lg:grid-cols-2">
        <div>
          <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Contact</p>
          <h1 className="mt-3 text-[36px] font-semibold tracking-tight">Write the desk, not a chatbot</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-[var(--mute)]">
            Use the report form for field needs. Use mail for applications and operational questions. If someone is
            trapped or injured, call local emergency numbers first.
          </p>
        </div>
        <dl className="border border-[var(--ink)] bg-white">
          <div className="border-b border-[var(--rule)] px-5 py-4">
            <dt className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Mail</dt>
            <dd className="mt-1 text-[16px]">
              <a href="mailto:aasra.support@gmail.com">aasra.support@gmail.com</a>
            </dd>
          </div>
          <div className="border-b border-[var(--rule)] px-5 py-4">
            <dt className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Public site</dt>
            <dd className="mt-1 text-[16px]">
              <a href="https://aasra.vercel.app">aasra.vercel.app</a>
            </dd>
          </div>
          <div className="border-b border-[var(--rule)] px-5 py-4">
            <dt className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Need help on the ground</dt>
            <dd className="mt-1 text-[16px]">
              <a href="/report">Report form — location in your own words</a>
            </dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Field teams</dt>
            <dd className="mt-1 text-[16px]">
              <a href="/join">Government / NGO verification</a>
            </dd>
          </div>
        </dl>
      </article>
    </Site>
  );
}
