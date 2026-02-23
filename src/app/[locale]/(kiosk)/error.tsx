"use client";

export default function KioskError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
      <div className="crt-glow text-xl font-bold text-red-400">
        {">"} SYSTEM ERROR
      </div>
      <button
        onClick={reset}
        className="rounded border border-kiosk-text bg-kiosk-text/10 px-4 py-2 font-mono text-sm text-kiosk-text hover:bg-kiosk-text/20"
      >
        RETRY
      </button>
    </div>
  );
}
