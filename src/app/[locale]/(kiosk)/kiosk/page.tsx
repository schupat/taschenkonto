"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useKioskPolling } from "@/hooks/useKioskPolling";
import { TerminalScreen } from "@/components/kiosk/TerminalScreen";
import { BalanceDisplay } from "@/components/kiosk/BalanceDisplay";
import { AsciiProgressBar } from "@/components/kiosk/AsciiProgressBar";
import { TerminalLog } from "@/components/kiosk/TerminalLog";
import { ChoreList } from "@/components/kiosk/ChoreList";
import { TerminalButton } from "@/components/kiosk/TerminalButtonRow";
import { InvestmentTerminal } from "@/components/kiosk/InvestmentTerminal";
import { InvestmentProjectionGraph } from "@/components/kiosk/InvestmentProjectionGraph";

const BOOT_LINES = [
  "KIDSVAULT TERMINAL v2.0",
  "Initializing secure connection...",
  "Loading account data...",
  "Establishing session...",
  "READY.",
];

export default function KioskDashboard() {
  const t = useTranslations("kiosk");
  const st = useTranslations("savingGoals");
  const router = useRouter();
  const locale = useLocale();
  const { data, error, loading, refetch } = useKioskPolling();
  const [booting, setBooting] = useState(true);
  const [bootLine, setBootLine] = useState(0);

  useEffect(() => {
    if (!loading && data) {
      const timer = setInterval(() => {
        setBootLine((prev) => {
          if (prev >= BOOT_LINES.length - 1) {
            clearInterval(timer);
            setTimeout(() => setBooting(false), 400);
            return prev;
          }
          return prev + 1;
        });
      }, 250);
      return () => clearInterval(timer);
    }
  }, [loading, data]);

  async function handleCompleteChore(assignmentId: string) {
    await fetch(`/api/kiosk/chores/${assignmentId}/complete`, {
      method: "POST",
    });
    refetch();
  }

  async function handleLogout() {
    await fetch("/api/kiosk/logout", { method: "POST" });
    router.push("/kiosk/login");
  }

  async function handleWithdrawInvestment(investmentId: string) {
    await fetch(`/api/kiosk/investments/${investmentId}/withdraw`, {
      method: "POST",
    });
    refetch();
  }

  async function handleTopUpInvestment(investmentId: string, amountCents: number) {
    await fetch(`/api/kiosk/investments/${investmentId}/topup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    });
    refetch();
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="crt-glow crt-flicker text-2xl">{">"} CONNECTING...</div>
      </div>
    );
  }

  if (error === "unauthorized") {
    router.push("/kiosk/login");
    return null;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
        <div className="crt-glow text-red-400 text-xl">{">"} SYSTEM ERROR</div>
        <div className="text-sm text-kiosk-text-dim">Connection failed. Check network.</div>
        <TerminalButton label="[ RETRY ]" onClick={refetch} />
      </div>
    );
  }

  // Boot sequence
  if (booting) {
    return (
      <div className="flex min-h-[80vh] flex-col justify-center px-4">
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
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{data.avatarEmoji}</span>
          <div>
            <h1 className="crt-glow text-2xl font-bold">{data.name}</h1>
            <span className="text-xs text-kiosk-text-dim">
              {">"} SESSION ACTIVE
              <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-kiosk-text" />
            </span>
          </div>
        </div>
        <TerminalButton label={t("logout")} onClick={handleLogout} variant="danger" />
      </div>

      {/* Balance */}
      <TerminalScreen title={t("yourBalance")}>
        <BalanceDisplay
          cents={data.saldoCents}
          currency={data.currency}
          locale={locale}
        />
      </TerminalScreen>

      {/* Saving Goals */}
      {data.savingGoals.length > 0 && (
        <TerminalScreen title={t("savingGoals")}>
          <div className="space-y-3">
            {data.savingGoals.map((goal) => (
              <div key={goal.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-kiosk-text">{goal.title}</span>
                  <span className="crt-glow-amber text-kiosk-amber">
                    {st("progress", {
                      current: new Intl.NumberFormat(
                        locale === "de" ? "de-DE" : "en-US",
                        { style: "currency", currency: data.currency }
                      ).format(Math.max(data.saldoCents, 0) / 100),
                      target: new Intl.NumberFormat(
                        locale === "de" ? "de-DE" : "en-US",
                        { style: "currency", currency: data.currency }
                      ).format(goal.targetCents / 100),
                    })}
                  </span>
                </div>
                <AsciiProgressBar
                  current={Math.max(data.saldoCents, 0)}
                  target={goal.targetCents}
                />
              </div>
            ))}
          </div>
        </TerminalScreen>
      )}

      {/* Investments */}
      {data.kioskInvestmentsEnabled && data.investments.length > 0 && (
        <TerminalScreen title="ANLAGEN">
          <InvestmentTerminal
            investments={data.investments}
            currency={data.currency}
            locale={locale}
            onWithdraw={handleWithdrawInvestment}
            onTopUp={handleTopUpInvestment}
          />
        </TerminalScreen>
      )}

      {/* Investment Projection (for first active investment) */}
      {data.kioskInvestmentsEnabled &&
        data.investments.length > 0 &&
        (() => {
          const activeInvestment = data.investments.find(
            (inv) => inv.status === "ACTIVE"
          );
          if (!activeInvestment) return null;
          return (
            <TerminalScreen title="ZINSPROGNOSE">
              <InvestmentProjectionGraph
                principalCents={activeInvestment.currentBalanceCents}
                rateBps={activeInvestment.interestRateBps}
                months={activeInvestment.termMonths ?? 12}
                currency={data.currency}
                locale={locale}
              />
            </TerminalScreen>
          );
        })()}

      {/* Chores */}
      {data.openChores.length > 0 && (
        <TerminalScreen title={t("chores")}>
          <ChoreList
            chores={data.openChores}
            currency={data.currency}
            locale={locale}
            onComplete={handleCompleteChore}
          />
        </TerminalScreen>
      )}

      {/* Transaction Log */}
      <TerminalScreen title={t("recentTransactions")}>
        <TerminalLog
          transactions={data.recentTransactions}
          currency={data.currency}
          locale={locale}
        />
      </TerminalScreen>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-kiosk-text-dim">
        <span className="crt-glow-amber text-kiosk-amber/50">&#9608;</span>
        {" "}KIDSVAULT TERMINAL v2.0 — AUTO-REFRESH 10s{" "}
        <span className="crt-glow-amber text-kiosk-amber/50">&#9608;</span>
      </div>
    </div>
  );
}
