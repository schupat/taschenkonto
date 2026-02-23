"use client";

import { getInvestmentProjection } from "@/lib/investment-projection";
import { formatCents } from "@/lib/utils";

interface InvestmentProjectionGraphProps {
  principalCents: number;
  rateBps: number;
  months?: number;
  currency: string;
  locale: string;
}

export function InvestmentProjectionGraph({
  principalCents,
  rateBps,
  months = 12,
  currency,
  locale,
}: InvestmentProjectionGraphProps) {
  const BAR_WIDTH = 28;
  const projection = getInvestmentProjection(principalCents, rateBps, months);

  // Pick evenly spaced intervals: start + 4-5 data points
  const intervalCount = Math.min(months, 5);
  const step = Math.max(1, Math.floor(months / intervalCount));
  const selectedMonths: number[] = [];
  for (let m = step; m <= months; m += step) {
    selectedMonths.push(m);
  }
  // Ensure the final month is included
  if (selectedMonths[selectedMonths.length - 1] !== months) {
    selectedMonths.push(months);
  }

  // Build display rows: start row + selected intervals
  const rows: { label: string; balanceCents: number }[] = [
    { label: "Start ", balanceCents: principalCents },
  ];
  for (const m of selectedMonths) {
    const point = projection[m - 1]; // projection is 0-indexed, month 1 at index 0
    if (point) {
      rows.push({
        label: `+${String(m).padStart(2, " ")} Mo`,
        balanceCents: point.balanceCents,
      });
    }
  }

  // Scale bars relative to the final balance (last row = full bar)
  const maxBalance = rows[rows.length - 1].balanceCents;
  const minBalance = rows[0].balanceCents;
  // Avoid division by zero if principal equals final (no interest)
  const range = maxBalance - minBalance || 1;

  // Total interest earned
  const totalInterest = maxBalance - principalCents;

  return (
    <div className="space-y-2 font-mono text-sm">
      <div className="crt-glow-amber text-kiosk-amber font-bold">
        {">"} PROGNOSE: So w{"\u00E4"}chst dein Geld
      </div>

      <div className="ml-2 space-y-1">
        {rows.map((row, idx) => {
          // Calculate bar fill: scale so start has some minimum and final is full
          const ratio =
            maxBalance === minBalance
              ? 1
              : 0.4 + 0.6 * ((row.balanceCents - minBalance) / range);
          const filled = Math.round(ratio * BAR_WIDTH);
          const empty = BAR_WIDTH - filled;

          return (
            <div
              key={idx}
              className="boot-line flex items-baseline gap-2"
              style={{ animationDelay: `${idx * 0.2}s` }}
            >
              <span className="w-[7ch] text-kiosk-text-dim">{row.label}</span>
              <span>
                <span className="crt-glow text-kiosk-text">
                  [{"\u2588".repeat(filled)}
                </span>
                <span className="text-kiosk-text-dim">
                  {"\u2591".repeat(empty)}]
                </span>
              </span>
              <span className="crt-glow-amber text-kiosk-amber">
                {formatCents(row.balanceCents, currency, locale)}
              </span>
            </div>
          );
        })}
      </div>

      {totalInterest > 0 && (
        <div
          className="boot-line ml-2 mt-2 crt-glow text-kiosk-text font-bold"
          style={{ animationDelay: `${rows.length * 0.2}s` }}
        >
          Zinsen gesamt: +{formatCents(totalInterest, currency, locale)} {"\u2728"}
        </div>
      )}
    </div>
  );
}
