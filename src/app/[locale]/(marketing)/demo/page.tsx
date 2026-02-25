"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

/* ── Static demo data (matches seed: Lena) ─────────────── */

const DEMO_CHILD = { name: "Lena", avatarEmoji: "👧" };

const DEMO_TRANSACTIONS = [
  { id: "1", amountCents: 500, type: "ALLOWANCE", description: "Taschengeld (wöchentlich)", daysAgo: 14 },
  { id: "2", amountCents: 500, type: "ALLOWANCE", description: "Taschengeld (wöchentlich)", daysAgo: 7 },
  { id: "3", amountCents: 200, type: "CHORE_REWARD", description: "Zimmer aufgeräumt", daysAgo: 5 },
  { id: "4", amountCents: -150, type: "WITHDRAWAL", description: "Eis gekauft", daysAgo: 3 },
  { id: "5", amountCents: 200, type: "DEPOSIT", description: "Oma Geschenk", daysAgo: 1 },
];

const DEMO_SALDO_CENTS = 1250; // Sum of transactions
const DEMO_SAVING_GOAL = { title: "Roller", targetCents: 5000 };
const DEMO_CHORES = [
  { id: "c1", title: "Zimmer aufräumen", rewardCents: 200 },
  { id: "c2", title: "Geschirr spülen", rewardCents: 150 },
];

const BOOT_LINES = [
  "TASCHENKONTO TERMINAL v2.0",
  "Initializing demo mode...",
  "Loading demo account...",
  "READY.",
];

export default function DemoPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [booting, setBooting] = useState(true);
  const [bootLine, setBootLine] = useState(0);

  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    signDisplay: "always",
  });

  const fmtBalance = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setBootLine((prev) => {
        if (prev >= BOOT_LINES.length - 1) {
          clearInterval(timer);
          setTimeout(() => setBooting(false), 400);
          return prev;
        }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // Progress bar helper
  function asciiBar(current: number, target: number, width = 20) {
    const ratio = target > 0 ? Math.min(current / target, 1) : 0;
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    const percent = Math.round(ratio * 100);
    return { filled, empty, percent };
  }

  const goal = asciiBar(Math.max(DEMO_SALDO_CENTS, 0), DEMO_SAVING_GOAL.targetCents);

  if (booting) {
    return (
      <DemoShell>
        <div className="flex min-h-[70vh] flex-col justify-center px-4">
          <div className="space-y-2">
            {BOOT_LINES.slice(0, bootLine + 1).map((line, i) => (
              <div
                key={i}
                className={`boot-line text-sm ${
                  i === 0
                    ? "crt-glow text-lg font-bold"
                    : i === BOOT_LINES.length - 1
                      ? "crt-glow font-bold"
                      : "text-kiosk-text-dim"
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {">"} {line}
                {i === bootLine && i < BOOT_LINES.length - 1 && (
                  <span className="cursor-blink" />
                )}
              </div>
            ))}
          </div>
        </div>
      </DemoShell>
    );
  }

  return (
    <DemoShell>
      <div className="flex flex-col gap-4 animate-fade-in p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{DEMO_CHILD.avatarEmoji}</span>
            <div>
              <h1 className="crt-glow text-2xl font-bold text-kiosk-text">
                {DEMO_CHILD.name}
              </h1>
              <span className="text-xs text-kiosk-text-dim">
                {">"} DEMO MODE
                <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-kiosk-text" />
              </span>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="rounded-lg border border-kiosk-border bg-kiosk-panel p-4">
          <div className="mb-2 text-xs text-kiosk-text-dim">
            {">"} {t("kiosk.yourBalance")}
          </div>
          <div className="crt-glow text-4xl font-bold tabular-nums text-kiosk-text sm:text-5xl">
            {fmtBalance.format(DEMO_SALDO_CENTS / 100)}
          </div>
        </div>

        {/* Saving Goal */}
        <div className="rounded-lg border border-kiosk-border bg-kiosk-panel p-4">
          <div className="mb-2 text-xs text-kiosk-text-dim">
            {">"} {t("kiosk.savingGoals")}
          </div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-kiosk-text">{DEMO_SAVING_GOAL.title}</span>
            <span className="crt-glow-amber text-kiosk-amber">
              {fmtBalance.format(Math.max(DEMO_SALDO_CENTS, 0) / 100)} / {fmtBalance.format(DEMO_SAVING_GOAL.targetCents / 100)}
            </span>
          </div>
          <span className="ascii-bar text-sm">
            <span className="text-kiosk-text">{"[" + "█".repeat(goal.filled)}</span>
            <span className="text-kiosk-text-dim">{"░".repeat(goal.empty) + "]"}</span>
            <span className="ml-2 text-kiosk-amber">{goal.percent}%</span>
          </span>
        </div>

        {/* Chores */}
        <div className="rounded-lg border border-kiosk-border bg-kiosk-panel p-4">
          <div className="mb-2 text-xs text-kiosk-text-dim">
            {">"} {t("kiosk.chores")}
          </div>
          <div className="space-y-2">
            {DEMO_CHORES.map((chore) => (
              <div key={chore.id} className="flex items-center justify-between rounded border border-kiosk-border bg-kiosk-bg/50 px-3 py-2">
                <span className="text-sm text-kiosk-text">{chore.title}</span>
                <span className="text-sm font-bold text-kiosk-amber">
                  +{fmtBalance.format(chore.rewardCents / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="rounded-lg border border-kiosk-border bg-kiosk-panel p-4">
          <div className="mb-2 text-xs text-kiosk-text-dim">
            {">"} {t("kiosk.recentTransactions")}
          </div>
          <div className="space-y-1 font-mono text-sm">
            {DEMO_TRANSACTIONS.map((tx) => {
              const date = new Date();
              date.setDate(date.getDate() - tx.daysAgo);
              const dateStr = date.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
                month: "2-digit",
                day: "2-digit",
              });
              const amount = fmt.format(tx.amountCents / 100);
              const color = tx.amountCents >= 0 ? "text-kiosk-text" : "text-red-400";
              return (
                <div key={tx.id} className="flex items-baseline gap-2">
                  <span className="text-kiosk-text-dim">{dateStr}</span>
                  <span className="flex-1 truncate text-kiosk-text-dim">
                    {tx.description}
                  </span>
                  <span className={`font-bold ${color}`}>{amount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 text-center text-xs text-kiosk-text-dim">
          <span className="crt-glow-amber text-kiosk-amber/50">&#9608;</span>
          {" "}TASCHENKONTO TERMINAL v2.0 — DEMO{" "}
          <span className="crt-glow-amber text-kiosk-amber/50">&#9608;</span>
        </div>

        {/* Back to landing */}
        <div className="text-center pb-4">
          <Link
            href="/login"
            className="rounded-full bg-kiosk-text px-6 py-2.5 text-sm font-bold text-kiosk-bg transition-all hover:bg-kiosk-text/80"
          >
            {t("marketing.cta")}
          </Link>
        </div>
      </div>
    </DemoShell>
  );
}

/* ── Shell wrapper with CRT effects ─────────────────────── */

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="crt-screen relative overflow-hidden rounded-2xl border border-kiosk-border bg-kiosk-bg font-mono text-kiosk-text">
        {/* Scanlines */}
        <div className="crt-scanlines pointer-events-none absolute inset-0 z-10" />
        {/* Refresh line */}
        <div className="crt-refresh-line pointer-events-none absolute inset-x-0 z-10" />
        {/* Content */}
        <div className="crt-screen-flicker relative z-0">
          {children}
        </div>
      </div>
    </div>
  );
}
