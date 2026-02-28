"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface Transaction {
  id: string;
  amountCents: number;
  type: string;
  origin: string;
  description: string;
  createdAt: string;
  revertedTransactionId?: string | null;
  isReverted?: boolean;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  DEPOSIT: {
    label: "transactions.deposit",
    icon: "↓",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  WITHDRAWAL: {
    label: "transactions.withdrawal",
    icon: "↑",
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
  ADJUSTMENT: {
    label: "transactions.adjustment",
    icon: "⟳",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  ALLOWANCE: {
    label: "transactions.allowance",
    icon: "✦",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  CHORE_REWARD: {
    label: "transactions.choreReward",
    icon: "★",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  INVESTMENT_DEPOSIT: {
    label: "transactions.investmentDeposit",
    icon: "🔒",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  INVESTMENT_WITHDRAWAL: {
    label: "transactions.investmentWithdrawal",
    icon: "🔓",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  INTEREST: {
    label: "transactions.interest",
    icon: "✨",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
};

function groupByDate(
  transactions: Transaction[],
  locale: string
): { label: string; transactions: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
    const key = d.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  return Array.from(groups.entries()).map(([label, txs]) => ({
    label,
    transactions: txs,
  }));
}

function RelativeDate({ dateStr, locale }: { dateStr: string; locale: string }) {
  const t = useTranslations("transactions");
  const d = new Date(dateStr);
  const now = new Date();
  // Compare calendar dates, not elapsed time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return <>{t("today") || "Heute"}</>;
  if (diffDays === 1) return <>{t("yesterday") || "Gestern"}</>;

  return (
    <>
      {d.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
        day: "numeric",
        month: "short",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })}
    </>
  );
}

type FilterKey = "all" | "DEPOSIT" | "WITHDRAWAL" | "ALLOWANCE" | "CHORE_REWARD" | "INVESTMENT";

const FILTER_OPTIONS: { key: FilterKey; types: string[]; label: string; icon: string }[] = [
  { key: "all", types: [], label: "transactions.all", icon: "" },
  { key: "DEPOSIT", types: ["DEPOSIT"], label: "transactions.deposit", icon: "↓" },
  { key: "WITHDRAWAL", types: ["WITHDRAWAL"], label: "transactions.withdrawal", icon: "↑" },
  { key: "ALLOWANCE", types: ["ALLOWANCE"], label: "transactions.allowance", icon: "✦" },
  { key: "CHORE_REWARD", types: ["CHORE_REWARD"], label: "transactions.choreReward", icon: "★" },
  { key: "INVESTMENT", types: ["INVESTMENT_DEPOSIT", "INVESTMENT_WITHDRAWAL", "INTEREST"], label: "investments.title", icon: "🔒" },
];

export function TransactionTable({
  transactions,
  currency,
  locale,
  showFilter = false,
  childId,
  allowRevert = false,
}: {
  transactions: Transaction[];
  currency: string;
  locale: string;
  showFilter?: boolean;
  childId?: string;
  allowRevert?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [revertingTx, setRevertingTx] = useState<Transaction | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  const filteredTransactions = activeFilter === "all"
    ? transactions
    : transactions.filter((tx) => {
        const option = FILTER_OPTIONS.find((f) => f.key === activeFilter);
        return option ? option.types.includes(tx.type) : true;
      });

  async function handleRevert() {
    if (!revertingTx || !childId) return;
    setIsReverting(true);
    try {
      const res = await fetch(
        `/api/children/${childId}/transactions/${revertingTx.id}/revert`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error");
        return;
      }
      router.refresh();
    } finally {
      setIsReverting(false);
      setRevertingTx(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-border-light text-2xl">
          📭
        </div>
        <p className="mt-4 font-medium text-text-secondary">
          {t("transactions.noTransactions")}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {locale === "de"
            ? "Erstelle die erste Buchung, um loszulegen."
            : "Create the first transaction to get started."}
        </p>
      </div>
    );
  }

  const groups = groupByDate(filteredTransactions, locale);

  return (
    <div className="divide-y divide-border/40">
      {showFilter && (
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.key;
            const count = option.key === "all"
              ? transactions.length
              : transactions.filter((tx) => option.types.includes(tx.type)).length;
            return (
              <button
                key={option.key}
                onClick={() => setActiveFilter(option.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-bg-app text-text-secondary hover:bg-border-light hover:text-text-primary"
                }`}
              >
                {option.icon && <span>{option.icon}</span>}
                {t(option.label)}
                <span className={`tabular-nums ${isActive ? "text-white/70" : "text-text-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {showFilter && filteredTransactions.length === 0 && transactions.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">
            {t("transactions.noTransactions")}
          </p>
        </div>
      )}
      {groups.map((group, gi) => (
        <div key={group.label}>
          {/* Date header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-bg-app/80 px-5 py-2.5 backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              <RelativeDate
                dateStr={group.transactions[0].createdAt}
                locale={locale}
              />
            </span>
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs tabular-nums text-text-muted">
              {group.transactions.length}
            </span>
          </div>

          {/* Transaction rows */}
          <div>
            {group.transactions.map((tx, ti) => {
              const config = TYPE_CONFIG[tx.type] || {
                icon: "•",
                color: "text-text-secondary",
                bgColor: "bg-border-light",
                label: tx.type,
              };
              const isPositive = tx.amountCents >= 0;
              const isReverted = tx.isReverted === true;
              const isRevertEntry = !!tx.revertedTransactionId;
              const canRevert = allowRevert && childId && !isReverted && !isRevertEntry;

              return (
                <div
                  key={tx.id}
                  className={`group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent-light/40 ${
                    isReverted ? "opacity-50" : ""
                  }`}
                  style={{
                    animationDelay: `${(gi * 5 + ti) * 30}ms`,
                  }}
                >
                  {/* Type icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ${config.bgColor} ${config.color} transition-transform group-hover:scale-110`}
                  >
                    {config.icon}
                  </div>

                  {/* Description + type + badge */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-text-primary">
                        {tx.description || t(config.label)}
                      </p>
                      {isReverted && (
                        <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          {t("transactions.reverted")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {t(config.label)}
                      <span className="mx-1.5 text-border">·</span>
                      {new Date(tx.createdAt).toLocaleTimeString(
                        locale === "de" ? "de-DE" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <span
                      className={`text-base font-bold tabular-nums ${
                        isPositive ? "text-success" : "text-danger"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatCents(tx.amountCents, currency, locale)}
                    </span>
                  </div>

                  {/* Revert button */}
                  {canRevert && (
                    <button
                      onClick={() => setRevertingTx(tx)}
                      title={t("transactions.revert")}
                      className="shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 8C2.5 5 5 2.5 8 2.5C11 2.5 13.5 5 13.5 8C13.5 11 11 13.5 8 13.5C6.2 13.5 4.6 12.6 3.6 11.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M2.5 11.5V8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Revert confirmation dialog */}
      <Dialog
        open={!!revertingTx}
        onClose={() => setRevertingTx(null)}
        title={t("transactions.revertTransaction")}
      >
        {revertingTx && (
          <div>
            <div className="rounded-lg bg-bg-app p-3">
              <p className="font-medium text-text-primary">
                {revertingTx.description}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {revertingTx.amountCents >= 0 ? "+" : ""}
                {formatCents(revertingTx.amountCents, currency, locale)}
              </p>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              {t("transactions.revertConfirm")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setRevertingTx(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleRevert}
                disabled={isReverting}
              >
                {t("transactions.revert")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
