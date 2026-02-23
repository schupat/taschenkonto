"use client";

import { useState } from "react";
import { formatCents } from "@/lib/utils";

interface Investment {
  id: string;
  type: string;
  status: string;
  principalCents: number;
  currentBalanceCents: number;
  interestRateBps: number;
  termMonths: number | null;
  maturityDate: string | null;
  withdrawalStatus: string | null;
}

interface InvestmentTerminalProps {
  investments: Investment[];
  currency: string;
  locale: string;
  onWithdraw: (investmentId: string) => void;
  onTopUp: (investmentId: string, amountCents: number) => void;
}

function statusIndicator(status: string): { symbol: string; label: string; className: string } {
  switch (status) {
    case "ACTIVE":
      return { symbol: "\u25A0", label: "AKTIV", className: "crt-glow text-kiosk-text" };
    case "MATURED":
      return { symbol: "\u25A0", label: "F\u00C4LLIG", className: "crt-glow-amber text-kiosk-amber" };
    case "WITHDRAWN":
      return { symbol: "\u25A0", label: "AUSGEZAHLT", className: "text-kiosk-text-dim" };
    default:
      return { symbol: "\u25A0", label: status, className: "text-kiosk-text-dim" };
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "TAGESGELD":
      return "TAGESGELD";
    case "FESTGELD":
      return "FESTGELD";
    default:
      return type;
  }
}

function canWithdraw(investment: Investment): boolean {
  if (investment.status === "WITHDRAWN") return false;
  if (investment.withdrawalStatus === "PENDING") return false;
  if (investment.type === "TAGESGELD" && investment.status === "ACTIVE") return true;
  if (investment.type === "FESTGELD" && investment.status === "MATURED") return true;
  return false;
}

function isLocked(investment: Investment): boolean {
  return investment.type === "FESTGELD" && investment.status === "ACTIVE";
}

export function InvestmentTerminal({
  investments,
  currency,
  locale,
  onWithdraw,
  onTopUp,
}: InvestmentTerminalProps) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState<string | null>(null);
  const [toppingUp, setToppingUp] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");

  if (investments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="py-2 text-kiosk-text-dim">
          {">"} Keine Anlagen vorhanden
        </div>
      </div>
    );
  }

  async function handleWithdraw(investmentId: string) {
    setConfirmingWithdraw(null);
    setWithdrawing(investmentId);
    onWithdraw(investmentId);
    setTimeout(() => setWithdrawing(null), 2000);
  }

  function handleTopUp(investmentId: string) {
    const cents = Math.round((parseFloat(topUpAmount) || 0) * 100);
    if (cents <= 0) return;
    onTopUp(investmentId, cents);
    setToppingUp(null);
    setTopUpAmount("");
  }

  return (
    <div className="space-y-4">
      {investments.map((inv, idx) => {
        const earned = inv.currentBalanceCents - inv.principalCents;
        const ratePercent = (inv.interestRateBps / 100).toFixed(2);
        const status = statusIndicator(inv.status);

        return (
          <div
            key={inv.id}
            className="boot-line space-y-1 font-mono text-sm"
            style={{ animationDelay: `${idx * 0.15}s` }}
          >
            {/* Type header */}
            <div className="crt-glow-amber text-kiosk-amber font-bold">
              {">"} {typeLabel(inv.type)} #{idx + 1}
            </div>

            {/* Details grid */}
            <div className="ml-2 space-y-0.5">
              <div className="flex gap-2">
                <span className="w-[14ch] text-kiosk-text-dim">Eingezahlt:</span>
                <span className="text-kiosk-text">
                  {formatCents(inv.principalCents, currency, locale)}
                </span>
              </div>

              <div className="flex gap-2">
                <span className="w-[14ch] text-kiosk-text-dim">Aktuell:</span>
                <span className="crt-glow text-kiosk-text font-bold">
                  {formatCents(inv.currentBalanceCents, currency, locale)}
                </span>
                {earned > 0 && (
                  <span className="crt-glow text-kiosk-text">
                    (+{formatCents(earned, currency, locale)})
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <span className="w-[14ch] text-kiosk-text-dim">Zinssatz:</span>
                <span className="text-kiosk-text">{ratePercent}% p.a.</span>
              </div>

              {inv.termMonths && (
                <div className="flex gap-2">
                  <span className="w-[14ch] text-kiosk-text-dim">Laufzeit:</span>
                  <span className="text-kiosk-text">{inv.termMonths} Monate</span>
                </div>
              )}

              <div className="flex gap-2">
                <span className="w-[14ch] text-kiosk-text-dim">Status:</span>
                <span className={status.className}>
                  {status.symbol} {status.label}
                </span>
              </div>

              {/* Locked Festgeld notice */}
              {isLocked(inv) && inv.maturityDate && (
                <div className="mt-1 crt-glow-amber text-kiosk-amber">
                  {">"} GESPERRT bis{" "}
                  {new Date(inv.maturityDate).toLocaleDateString(
                    locale === "de" ? "de-DE" : "en-US",
                    { day: "2-digit", month: "2-digit", year: "numeric" }
                  )}
                </div>
              )}

              {/* Pending withdrawal notice */}
              {inv.withdrawalStatus === "PENDING" && (
                <div className="mt-2 crt-glow-amber text-kiosk-amber text-sm">
                  {">"} AUSZAHLUNG ANGEFRAGT...
                  <br />
                  <span className="text-kiosk-text-dim text-xs">
                    Ein Elternteil muss genehmigen.
                  </span>
                </div>
              )}

              {/* Withdraw button with confirmation */}
              {canWithdraw(inv) && (
                <div className="mt-2">
                  {confirmingWithdraw === inv.id ? (
                    <div className="space-y-2">
                      <div className="crt-glow-amber text-kiosk-amber text-sm">
                        {">"} Bist du sicher?
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWithdraw(inv.id)}
                          disabled={withdrawing === inv.id}
                          className="rounded border border-kiosk-text bg-kiosk-text/10 px-4 py-2 font-mono text-sm font-bold text-kiosk-text hover:bg-kiosk-text/20 active:scale-95 disabled:opacity-40"
                        >
                          {withdrawing === inv.id ? "[ ... ]" : "[ JA ]"}
                        </button>
                        <button
                          onClick={() => setConfirmingWithdraw(null)}
                          className="rounded border border-kiosk-text-dim bg-kiosk-text/5 px-4 py-2 font-mono text-sm font-bold text-kiosk-text-dim hover:bg-kiosk-text/10 active:scale-95"
                        >
                          [ NEIN ]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingWithdraw(inv.id)}
                      className="rounded border border-kiosk-text bg-kiosk-text/10 px-4 py-2 font-mono text-sm font-bold text-kiosk-text hover:bg-kiosk-text/20 active:scale-95"
                    >
                      [ AUSZAHLEN ]
                    </button>
                  )}
                </div>
              )}

              {/* Top-up button for active Tagesgeld */}
              {inv.type === "TAGESGELD" && inv.status === "ACTIVE" && inv.withdrawalStatus !== "PENDING" && (
                <div className="mt-2">
                  {toppingUp === inv.id ? (
                    <div className="space-y-2">
                      <div className="crt-glow text-kiosk-text text-sm">
                        {">"} Betrag eingeben:
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="5.00"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          className="w-24 rounded border border-kiosk-text/30 bg-kiosk-bg px-2 py-2 font-mono text-sm text-kiosk-text placeholder:text-kiosk-text-dim focus:border-kiosk-text focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleTopUp(inv.id)}
                          disabled={Math.round((parseFloat(topUpAmount) || 0) * 100) <= 0}
                          className="rounded border border-kiosk-text bg-kiosk-text/10 px-4 py-2 font-mono text-sm font-bold text-kiosk-text hover:bg-kiosk-text/20 active:scale-95 disabled:opacity-40"
                        >
                          [ OK ]
                        </button>
                        <button
                          onClick={() => { setToppingUp(null); setTopUpAmount(""); }}
                          className="rounded border border-kiosk-text-dim bg-kiosk-text/5 px-4 py-2 font-mono text-sm font-bold text-kiosk-text-dim hover:bg-kiosk-text/10 active:scale-95"
                        >
                          [ X ]
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setToppingUp(inv.id)}
                      className="rounded border border-kiosk-text bg-kiosk-text/10 px-4 py-2 font-mono text-sm font-bold text-kiosk-text hover:bg-kiosk-text/20 active:scale-95"
                    >
                      [ NACHZAHLEN ]
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Separator between investments */}
            {idx < investments.length - 1 && (
              <div className="border-b border-kiosk-border/50 pt-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}
