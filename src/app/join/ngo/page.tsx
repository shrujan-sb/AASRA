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
        <div className="site-wrap max-w-[560px] py-16">
          <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">Application</p>
          <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Sent for review</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--mute)]">
            Wait for an admin email. Then sign in from Support team → I am already approved.
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
        <h1 className="mt-4 text-[32px] font-semibold tracking-tight">NGOs and volunteers</h1>
        <p className="mt-2 text-[16px] text-[var(--mute)]">Prove the organisation or volunteer card before you enter the desk.</p>

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Full name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="site-input" />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Gmail</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="site-input" />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Organisation</label>
        <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} className="site-input" placeholder="NGO name, or Independent volunteer" />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Role</label>
        <select value={volunteerRole} onChange={(e) => setVolunteerRole(e.target.value)} className="site-select">
          <option>NGO staff</option>
          <option>Field volunteer</option>
          <option>Medical volunteer</option>
        </select>

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Registration / volunteer ID</label>
        <input required value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className="site-input" />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Phone</label>
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="site-input" />

        <label className="mt-4 block text-[14px] text-[var(--mute)]">Area you cover</label>
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

        <label className="mt-4 block text-[14px] text-[var(--mute)]">ID / org letter photo</label>
        <input required type="file" accept="image/*" className="mt-2 w-full" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Proof" className="mt-2 max-h-40 object-contain border border-[var(--rule)]" />
        )}

        <button type="submit" className="site-btn site-btn-ink mt-6 w-full">
          Submit for review
        </button>
        {err && <p className="mt-2 text-[var(--crit)]">{err}</p>}
      </form>
    </Site>
  );
}
