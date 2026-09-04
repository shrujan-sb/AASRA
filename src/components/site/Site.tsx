"use client";

import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Site({ children }: { children: ReactNode }) {
  return (
    <div className="desk-bg flex min-h-full flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
