import Link from "next/link";
import { Site } from "@/components/site/Site";

export default function NotFound() {
  return (
    <Site>
      <div className="site-wrap py-20">
        <p className="text-[13px] tracking-[0.2em] uppercase text-[var(--mute)]">404</p>
        <h1 className="mt-3 text-[36px] font-semibold tracking-tight">No desk, ward, or report lives here</h1>
        <p className="mt-4 max-w-[42ch] text-[17px] text-[var(--mute)]">The URL does not match a public page or an ops screen.</p>
        <Link href="/" className="mt-8 inline-flex site-btn site-btn-ink">
          Back to Aasra
        </Link>
      </div>
    </Site>
  );
}
