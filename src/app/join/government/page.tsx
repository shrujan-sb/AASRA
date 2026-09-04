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
        <div className="site-wrap max-w-[560px] py-16">
          <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Application</p>
          <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Sent for review</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
            An admin will look at your ID. You get mail when they decide. Then use Support team → I am already approved.
          </p>
          <Link href="/" className="site-btn site-btn-ink mt-8">
            Home
          </Link>
        </div>
      </Site>
    );
  }

  return (
    <Site>
      <form onSubmit={(e) => void submit(e)} className="site-wrap max-w-[560px] py-12">
        <Link href="/join" className="text-[14px] text-[var(--mute)]">
          Support team
        </Link>
        <h1 className="mt-4 text-[32px] font-semibold tracking-tight">Government official</h1>
        <p className="mt-2 text-[16px] text-[var(--mute)]">Photo of your government ID is required.</p>

        <Field label="Full name" value={name} onChange={setName} required />
        <Field label="Work Gmail" value={email} onChange={setEmail} type="email" required />
        <Field label="Department" value={department} onChange={setDepartment} required />
        <Field label="Designation" value={designation} onChange={setDesignation} required />
        <Field label="ID / employee number" value={idNumber} onChange={setIdNumber} required />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Area you are posted</label>
        <PlaceSuggest
          value={area}
          onChange={(label, nextLat, nextLng) => {
            setArea(label);
            setLat(nextLat);
            setLng(nextLng);
          }}
          placeholder="Type your mandal, town, or landmark"
        />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">ID card photo</label>
        <input
          required
          type="file"
          accept="image/*"
          className="mt-2 w-full"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="ID preview" className="mt-2 max-h-40 object-contain border border-[var(--rule)]" />
        )}

        <button type="submit" className="site-btn site-btn-ink mt-6 w-full">
          Submit for review
        </button>
        {err && <p className="mt-2 text-[var(--crit)]">{err}</p>}
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
    <>
      <label className="block mt-4 text-[14px] text-[var(--mute)]">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="site-input"
      />
    </>
  );
}
