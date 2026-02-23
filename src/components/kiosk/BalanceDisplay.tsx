"use client";

import { useEffect, useRef, useState } from "react";

interface BalanceDisplayProps {
  cents: number;
  currency: string;
  locale?: string;
}

export function BalanceDisplay({ cents, currency, locale = "de" }: BalanceDisplayProps) {
  const [displayed, setDisplayed] = useState(cents);
  const targetRef = useRef(cents);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    targetRef.current = cents;
    const start = displayed;
    const diff = cents - start;
    if (diff === 0) return;

    const duration = 600; // ms
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  const formatted = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(displayed / 100);

  return (
    <div className="my-4 text-center">
      <div
        className={`crt-glow text-5xl font-bold tabular-nums ${
          displayed >= 0 ? "text-kiosk-text" : "text-red-500"
        }`}
      >
        {formatted}
      </div>
    </div>
  );
}
