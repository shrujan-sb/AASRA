"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BootScreen } from "@/components/site/BootScreen";
import { supportDeskPath } from "@/lib/supportKind";

export default function SupportIndex() {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session || session.role !== "support") {
      router.replace("/join");
      return;
    }
    router.replace(supportDeskPath(session.supportKind ?? "ngo"));
  }, [ready, session, router]);

  return <BootScreen label="Opening your field desk" />;
}
