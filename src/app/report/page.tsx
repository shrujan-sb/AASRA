"use client";

import { useState } from "react";
import { Site } from "@/components/site/Site";
import { PlaceField, geocodePlace } from "@/components/PlaceField";

const DEMOS = [
  { location: "Lane behind old vegetable market, Tenali", need: "need 80 blankets and drinking water, 12 families on first floors", name: "Lakshmi" },
  { location: "Canal bund near Autonagar flyover", need: "need boat evac 9 people trapped on rooftops NOW", name: "Ramesh" },
  { location: "Primary school, Pedakakani junction", need: "medical camp needs 2 nurses, children with fever", name: "" },
];

export default function ReportPage() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function setPlace(label: string, nextLat?: number, nextLng?: number) {
    setLocation(label);
    setLat(nextLat);
    setLng(nextLng);
  }

  async function send(loc: string, need: string, who: string, nextLat?: number, nextLng?: number) {
    setErr("");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: loc,
        need,
        name: who,
        lat: nextLat,
        lng: nextLng,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      ticket?: import("@/lib/db").PublicTicket;
    };
    if (!res.ok || !data.ok || !data.ticket) {
      setErr(data.error || "Could not reach the desk.");
      return;
    }
    const { applyPublicTicket } = await import("@/lib/db");
    applyPublicTicket(data.ticket);
    setSent(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim() || !text.trim()) {
      setErr("Pick a location and say what is needed.");
      return;
    }
    setBusy(true);
    try {
      await send(location.trim(), text.trim(), name, lat, lng);
      setText("");
      setLocation("");
      setName("");
      setLat(undefined);
      setLng(undefined);
    } finally {
      setBusy(false);
    }
  }

  async function demo() {
    setBusy(true);
    try {
      const row = DEMOS[Math.floor(Math.random() * DEMOS.length)]!;
      const hit = await geocodePlace(row.location);
      setName(row.name);
      setLocation(hit?.label || row.location);
      setLat(hit?.lat);
      setLng(hit?.lng);
      setText(row.need);
      await send(hit?.label || row.location, row.need, row.name, hit?.lat, hit?.lng);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Site>
      <form onSubmit={(e) => void submit(e)} className="site-wrap py-12">
        <p className="text-[13px] tracking-[0.18em] uppercase text-[var(--mute)]">Public intake</p>
        <h1 className="mt-3 max-w-[18ch] text-[32px] font-semibold tracking-tight">Report help</h1>
        <p className="mt-2 max-w-[52ch] text-[16px] leading-relaxed text-[var(--mute)]">
          Type a place and choose from the five names, or drop a pin. Name is optional. Send is instant — the clerk
          studies it in the background.
        </p>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <label className="block text-[14px] text-[var(--mute)]">Your name (optional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="site-input"
              placeholder="If you want to be reached"
            />

            <label className="mt-4 block text-[14px] text-[var(--mute)]">What is needed</label>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="site-textarea"
              placeholder="Blankets, boat, water, medical…"
            />

            <button type="submit" disabled={busy} className="site-btn site-btn-ink mt-6 w-full disabled:opacity-50">
            {busy ? "Sending…" : "Send to desk"}
            </button>
            <button type="button" disabled={busy} onClick={() => void demo()} className="site-btn site-btn-paper mt-2 w-full disabled:opacity-50">
              Demo report
            </button>
            {sent && <p className="mt-3 text-[var(--ok)]">Desk has the ticket. The nearest team sees it as recommended.</p>}
            {err && <p className="mt-3 text-[var(--crit)]">{err}</p>}
          </div>

          <div className="relative z-10 lg:col-span-7">
            <label className="block text-[14px] text-[var(--mute)]">Location</label>
            <PlaceField value={location} lat={lat} lng={lng} onChange={setPlace} />
          </div>
        </div>
      </form>
    </Site>
  );
}
