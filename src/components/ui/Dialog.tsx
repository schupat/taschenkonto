"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        "rounded-xl border border-border bg-bg-card p-0 shadow-xl backdrop:bg-black/50",
        "w-full max-w-md",
        className
      )}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  );
}
