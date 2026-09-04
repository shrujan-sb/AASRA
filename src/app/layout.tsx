import type { Metadata } from "next";
import { IBM_Plex_Mono, Oxanium } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibm = IBM_Plex_Mono({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Aasra ReliefMesh — Sector Control",
  description: "Disaster-response resource coordination console",
  icons: { icon: "/brand/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${oxanium.variable} ${ibm.variable} h-full`}>
      <body className="min-h-full console-grid">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
