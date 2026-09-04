"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAdminEmail } from "@/lib/admins";
import { firebaseEnabled } from "@/lib/firebase";
import { BootScreen } from "@/components/site/BootScreen";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/lib/auth";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let live = true;
    if (!ready) return;
    if (!session || session.role !== "admin" || (firebaseEnabled() && session.mode !== "firebase")) {
      setAllowed(false);
      setChecked(true);
      return;
    }
    void checkAdminEmail(session.email).then((ok) => {
      if (!live) return;
      setAllowed(ok);
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [ready, session]);

  useEffect(() => {
    if (ready && checked && !allowed) router.replace("/");
  }, [ready, checked, allowed, router]);

  if (!ready || !checked || !allowed) {
    return <BootScreen label="Checking desk keys" />;
  }

  return <Shell>{children}</Shell>;
}
