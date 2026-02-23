"use client";

import { cn } from "@/lib/utils";

interface TerminalButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export function TerminalButton({ label, onClick, variant = "default", disabled }: TerminalButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded border px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-colors",
        "active:scale-95 disabled:opacity-40",
        variant === "default" &&
          "border-kiosk-text bg-kiosk-text/10 text-kiosk-text hover:bg-kiosk-text/20",
        variant === "danger" &&
          "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
      )}
    >
      {label}
    </button>
  );
}

interface TerminalButtonRowProps {
  children: React.ReactNode;
  className?: string;
}

export function TerminalButtonRow({ children, className }: TerminalButtonRowProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {children}
    </div>
  );
}
