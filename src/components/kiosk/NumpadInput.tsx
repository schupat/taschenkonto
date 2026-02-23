"use client";

import { useState } from "react";

interface NumpadInputProps {
  maxLength?: number;
  onSubmit: (pin: string) => void;
  disabled?: boolean;
}

export function NumpadInput({ maxLength = 6, onSubmit, disabled }: NumpadInputProps) {
  const [pin, setPin] = useState("");

  function handleDigit(d: string) {
    if (pin.length < maxLength) {
      const next = pin + d;
      setPin(next);
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
  }

  function handleSubmit() {
    if (pin.length >= 4) {
      onSubmit(pin);
      setPin("");
    }
  }

  const dots = Array.from({ length: maxLength }, (_, i) => (
    <span
      key={i}
      className={`inline-block h-4 w-4 rounded-full border-2 ${
        i < pin.length
          ? "border-kiosk-text bg-kiosk-text shadow-[0_0_6px_var(--color-kiosk-glow)]"
          : "border-kiosk-border bg-transparent"
      }`}
    />
  ));

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots */}
      <div className="flex gap-3">{dots}</div>

      {/* Numpad grid */}
      <div className="grid w-64 grid-cols-3 gap-2">
        {digits.map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={disabled}
            className="rounded border border-kiosk-border bg-kiosk-bg py-4 text-2xl font-bold text-kiosk-text transition-colors hover:border-kiosk-text hover:bg-kiosk-text/10 active:scale-95 disabled:opacity-40"
          >
            {d}
          </button>
        ))}
        {/* Bottom row: Delete, 0, Enter */}
        <button
          onClick={handleDelete}
          disabled={disabled || pin.length === 0}
          className="rounded border border-kiosk-border bg-kiosk-bg py-4 text-lg font-bold text-red-400 transition-colors hover:border-red-400 hover:bg-red-500/10 active:scale-95 disabled:opacity-40"
        >
          ←
        </button>
        <button
          onClick={() => handleDigit("0")}
          disabled={disabled}
          className="rounded border border-kiosk-border bg-kiosk-bg py-4 text-2xl font-bold text-kiosk-text transition-colors hover:border-kiosk-text hover:bg-kiosk-text/10 active:scale-95 disabled:opacity-40"
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          disabled={disabled || pin.length < 4}
          className="rounded border border-kiosk-text bg-kiosk-text/10 py-4 text-lg font-bold text-kiosk-text transition-colors hover:bg-kiosk-text/20 active:scale-95 disabled:opacity-40"
        >
          OK
        </button>
      </div>
    </div>
  );
}
