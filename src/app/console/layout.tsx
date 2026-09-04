"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/lib/auth";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/");
  }, [ready, session, router]);

  if (!ready || !session) {
    return <div className="p-3 text-[11px] text-[var(--muted)]">AUTH GATE…</div>;
  }

  return <Shell>{children}</Shell>;
}
