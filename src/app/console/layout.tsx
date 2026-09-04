"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminEmail } from "@/lib/admins";
import { firebaseEnabled } from "@/lib/firebase";
import { BootScreen } from "@/components/site/BootScreen";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/lib/auth";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();
  const allowed = Boolean(
    session &&
      session.role === "admin" &&
      isAdminEmail(session.email) &&
      (!firebaseEnabled() || session.mode === "firebase"),
  );

  useEffect(() => {
    if (ready && !allowed) router.replace("/");
  }, [ready, allowed, router]);

  if (!ready || !allowed) {
    return <BootScreen label="Checking desk keys" />;
  }

  return <Shell>{children}</Shell>;
}
