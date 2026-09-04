export function BootScreen({ label = "Opening the desk" }: { label?: string }) {
  return (
    <div className="desk-bg flex min-h-full flex-col items-center justify-center px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark.png" alt="" className="h-16 w-16 object-contain" />
      <p className="mt-6 text-[13px] tracking-[0.22em] uppercase text-[var(--mute)]">Aasra ReliefMesh</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Aasra</h1>
      <div className="mt-8 h-[2px] w-40 overflow-hidden">
        <div className="boot-bar w-full" />
      </div>
      <p className="mt-4 text-[15px] text-[var(--mute)]">{label}</p>
      <p className="mt-10 flex gap-6 text-[13px] text-[var(--mute)]">
        <span>Prepare</span>
        <span>Respond</span>
        <span>Rebuild</span>
      </p>
    </div>
  );
}
