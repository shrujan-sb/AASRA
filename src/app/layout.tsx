import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const wadingr = localFont({
  src: "../fonts/WadingrTrial.otf",
  variable: "--font-wadingr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aasra — Relief mesh for a flood sector",
  description: "Public reports, verified field teams, and a ranked officer desk.",
  icons: { icon: "/brand/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${wadingr.variable} h-full`}>
      <body className={`${poppins.className} h-full`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
