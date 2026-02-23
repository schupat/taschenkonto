export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-kiosk-bg font-mono text-kiosk-text overflow-hidden crt-screen-flicker">
      {/* CRT vignette — darkened edges like a curved tube */}
      <div
        className="pointer-events-none fixed inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* CRT scanline overlay — animated drift */}
      <div className="crt-scanlines pointer-events-none fixed inset-0 z-10" />

      {/* CRT rolling refresh line — bright bar sweeping down */}
      <div className="crt-refresh-line pointer-events-none fixed inset-x-0 z-[15]" />

      {/* CRT noise grain — subtle animated static */}
      <div className="crt-noise" />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-kiosk-text/5 blur-3xl" />
      </div>

      {/* CRT screen container */}
      <div className="relative z-[5] mx-auto max-w-2xl px-4 py-6">
        {children}
      </div>
    </div>
  );
}
