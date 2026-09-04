"use client";

import { useState } from "react";
import Link from "next/link";
import { Site } from "@/components/site/Site";
import { fileToJpegDataUrl } from "@/lib/image";
import { PlaceSuggest } from "@/components/PlaceField";
import { submitSupportApplication } from "@/lib/submitApplication";

export default function GovernmentApply() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [photo, setPhoto] = useState("");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(f: File | null) {
    if (!f) return;
    setPhoto(await fileToJpegDataUrl(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!photo) {
      setErr("Upload a photo of your government ID.");
      return;
    }
    if (!area.trim() || lat == null || lng == null) {
      setErr("Pick your posting area from the five suggestions.");
      return;
    }
    try {
      await submitSupportApplication({
        kind: "government",
        name,
        email,
        department,
        designation,
        idNumber,
        photoDataUrl: photo,
        areaLabel: area,
        lat,
        lng,
      });
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    }
  }

  if (done) {
    return (
      <Site>
        <div className="site-wrap max-w-[640px] py-16">
          <div className="desk-file">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Receipt</span>
              <span className="text-[13px] text-[var(--ok)]">Filed</span>
            </div>
            <div className="px-5 py-8">
              <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Application desk</p>
              <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Sent for review</h1>
              <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
                An admin will look at your ID. Mail comes when they decide. Then Support team → I am already approved.
              </p>
              <Link href="/" className="site-btn site-btn-ink mt-8">
                Home
              </Link>
            </div>
          </div>
        </div>
      </Site>
    );
  }

  return (
    <Site>
      <form onSubmit={(e) => void submit(e)} className="site-wrap grid items-start gap-10 py-12 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <Link href="/join" className="text-[14px] text-[var(--mute)]">
            ← Application desk
          </Link>
          <p className="mt-6 text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">File 01</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Government official</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
            Photograph the government card. Pick your posting from the five suggestions. Nearby reports show as recommended
            on the government desk.
          </p>
          <ol className="mt-6 space-y-2 text-[14px] text-[var(--mute)]">
            <li>01 · Name, work Gmail, department</li>
            <li>02 · Area you are posted — pick from the list</li>
            <li>03 · ID card photo</li>
          </ol>
        </div>

        <div className="lg:col-span-8">
          <section className="desk-file">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Identity</span>
              <span className="text-[13px] text-[var(--mute)]">01</span>
            </div>
            <div className="grid gap-x-4 px-5 py-4 sm:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="Work Gmail" value={email} onChange={setEmail} type="email" required />
              <Field label="Department" value={department} onChange={setDepartment} required />
              <Field label="Designation" value={designation} onChange={setDesignation} required />
              <div className="sm:col-span-2">
                <Field label="ID / employee number" value={idNumber} onChange={setIdNumber} required />
              </div>
            </div>
          </section>

          <section className="desk-file mt-4">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Area you are posted</span>
              <span className="text-[13px] text-[var(--mute)]">02</span>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[14px] text-[var(--mute)]">Mandal, town, or landmark — pick one of five</label>
              <PlaceSuggest
                value={area}
                onChange={(label, nextLat, nextLng) => {
                  setArea(label);
                  setLat(nextLat);
                  setLng(nextLng);
                }}
                placeholder="Start typing — street, mandal, landmark…"
              />
              <p className="mt-2 text-[13px] text-[var(--mute)]">Reports nearest this pin show as recommended on the government desk.</p>
            </div>
          </section>

          <section className="desk-file mt-4">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Proof</span>
              <span className="text-[13px] text-[var(--mute)]">03</span>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[14px] text-[var(--mute)]">ID card photo</label>
              <input
                required
                type="file"
                accept="image/*"
                className="mt-2 w-full border border-[var(--ink)] bg-white p-3"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="ID preview" className="mt-3 max-h-40 object-contain border border-[var(--ink)] bg-white p-2" />
              )}
            </div>
          </section>

          <button type="submit" className="site-btn site-btn-ink mt-6 w-full">
            Submit for review
          </button>
          {err && <p className="mt-3 text-[var(--crit)]">{err}</p>}
        </div>
      </form>
    </Site>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mt-3 block text-[14px] text-[var(--mute)]">{label}</label>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="site-input" />
    </div>
  );
}
