"use client";

import { cn } from "@/lib/utils";

interface TerminalScreenProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function TerminalScreen({ title, children, className }: TerminalScreenProps) {
  return (
    <div
      className={cn(
        "kiosk-panel crt-screen rounded-lg border border-kiosk-border bg-kiosk-panel p-4",
        className
      )}
    >
      {title && (
        <div className="mb-3 border-b border-kiosk-border pb-2">
          <h2 className="crt-glow text-sm font-bold uppercase tracking-[0.2em]">
            <span className="text-kiosk-text-dim">[ </span>
            {title}
            <span className="text-kiosk-text-dim"> ]</span>
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}
