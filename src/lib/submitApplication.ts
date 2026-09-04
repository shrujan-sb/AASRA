"use client";

import { applyApplication, nid } from "@/lib/db";
import type { SupportApplication } from "@/lib/types";

export async function submitSupportApplication(
  row: Omit<SupportApplication, "id" | "status" | "createdAt"> & { photoDataUrl: string },
): Promise<void> {
  const application: SupportApplication = {
    ...row,
    id: nid("APP"),
    email: row.email.trim().toLowerCase(),
    status: "pending",
    createdAt: Date.now(),
  };
  applyApplication(application);
  const res = await fetch("/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(application),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok && !data.ok) {
    throw new Error(data.error || "Could not submit application.");
  }
}
