"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BootScreen } from "@/components/site/BootScreen";

export default function RiskRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/console/predict#risk-assessment");
  }, [router]);
  return <BootScreen label="Opening Predict" />;
}
