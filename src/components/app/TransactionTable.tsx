"use client";

import { formatCents } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Transaction {
  id: string;
  amountCents: number;
  type: string;
  origin: string;
  description: string;
  createdAt: string;
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
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
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

export function TransactionTable({
  transactions,
  currency,
  locale,
}: {
  transactions: Transaction[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations();

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

  const groups = groupByDate(transactions, locale);

  return (
    <div className="divide-y divide-border/40">
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

              return (
                <div
                  key={tx.id}
                  className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent-light/40"
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

                  {/* Description + type */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">
                      {tx.description || t(config.label)}
                    </p>
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
