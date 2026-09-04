"use client";

import { useState } from "react";
import Link from "next/link";
import { Site } from "@/components/site/Site";
import { fileToJpegDataUrl } from "@/lib/image";
import { PlaceSuggest } from "@/components/PlaceField";
import { submitSupportApplication } from "@/lib/submitApplication";

export default function NgoApply() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [volunteerRole, setVolunteerRole] = useState("NGO staff");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
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
      setErr("Upload a photo of your NGO ID, registration letter, or volunteer card.");
      return;
    }
    if (!area.trim() || lat == null || lng == null) {
      setErr("Pick your area from the five suggestions.");
      return;
    }
    try {
      await submitSupportApplication({
        kind: "ngo",
        name,
        email,
        orgName,
        registrationNo,
        volunteerRole,
        phone,
        note,
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
                Wait for mail from aasra.support@gmail.com. Then Support team → I am already approved, with this Gmail.
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
          <p className="mt-6 text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">File 02</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">NGOs and volunteers</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
            This is a paper file, not a chat. The clerk reads it. An admin can still hold the stamp.
          </p>
          <ol className="mt-6 space-y-2 text-[14px] text-[var(--mute)]">
            <li>01 · Name, Gmail, organisation</li>
            <li>02 · Area you cover — pick from the list</li>
            <li>03 · Photo of ID, letter, or volunteer card</li>
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
              <Field label="Gmail" value={email} onChange={setEmail} type="email" required />
              <div className="sm:col-span-2">
                <Field
                  label="Organisation"
                  value={orgName}
                  onChange={setOrgName}
                  required
                  placeholder="NGO name, or Independent volunteer"
                />
              </div>
              <div>
                <label className="mt-3 block text-[14px] text-[var(--mute)]">Role</label>
                <select value={volunteerRole} onChange={(e) => setVolunteerRole(e.target.value)} className="site-select">
                  <option>NGO staff</option>
                  <option>Field volunteer</option>
                  <option>Medical volunteer</option>
                </select>
              </div>
              <Field label="Registration / volunteer ID" value={registrationNo} onChange={setRegistrationNo} required />
              <Field label="Phone" value={phone} onChange={setPhone} required />
            </div>
          </section>

          <section className="desk-file mt-4">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Area you cover</span>
              <span className="text-[13px] text-[var(--mute)]">02</span>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[14px] text-[var(--mute)]">Mandal, town, or landmark</label>
              <PlaceSuggest
                value={area}
                onChange={(label, nextLat, nextLng) => {
                  setArea(label);
                  setLat(nextLat);
                  setLng(nextLng);
                }}
                placeholder="Type your mandal, town, or landmark"
              />
              <label className="mt-4 block text-[14px] text-[var(--mute)]">Why you are deploying</label>
              <textarea required value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="site-textarea" />
            </div>
          </section>

          <section className="desk-file mt-4">
            <div className="desk-file-head">
              <span className="text-[13px] tracking-[0.14em] uppercase text-[var(--mute)]">Proof</span>
              <span className="text-[13px] text-[var(--mute)]">03</span>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[14px] text-[var(--mute)]">ID / org letter photo</label>
              <input
                required
                type="file"
                accept="image/*"
                className="mt-2 w-full border border-[var(--ink)] bg-white p-3"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Proof" className="mt-3 max-h-40 object-contain border border-[var(--ink)] bg-white p-2" />
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mt-3 block text-[14px] text-[var(--mute)]">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="site-input"
      />
    </div>
  );
}
