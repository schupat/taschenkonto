"use client";

import { useTranslations } from "next-intl";

interface Transaction {
  id: string;
  amountCents: number;
  type: string;
  description: string | null;
  createdAt: string;
}

interface TerminalLogProps {
  transactions: Transaction[];
  currency: string;
  locale?: string;
}

function typeLabel(type: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    DEPOSIT: t("deposit"),
    WITHDRAWAL: t("withdrawal"),
    ALLOWANCE: t("allowance"),
    CHORE_REWARD: t("choreReward"),
    ADJUSTMENT: t("adjustment"),
  };
  return map[type] ?? type; // eslint-disable-line security/detect-object-injection
}

export function TerminalLog({ transactions, currency, locale = "de" }: TerminalLogProps) {
  const t = useTranslations("transactions");
  const kt = useTranslations("kiosk");

  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    signDisplay: "always",
  });

  if (transactions.length === 0) {
    return (
      <div className="py-2 text-kiosk-text-dim">
        {t("noTransactions")}
      </div>
    );
  }

  return (
    <div className="space-y-1 font-mono text-sm">
      <div className="mb-2 text-kiosk-text-dim">
        {">"} {kt("recentTransactions")}
      </div>
      {transactions.map((tx) => {
        const date = new Date(tx.createdAt);
        const dateStr = date.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
          month: "2-digit",
          day: "2-digit",
        });
        const amount = fmt.format(tx.amountCents / 100);
        const color = tx.amountCents >= 0 ? "text-kiosk-text" : "text-red-400";
        return (
          <div key={tx.id} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 sm:flex sm:items-baseline sm:gap-2">
            <span className="text-kiosk-text-dim">{dateStr}</span>
            <span className="min-w-0 text-kiosk-text-dim sm:flex-1 sm:truncate">
              {tx.description || typeLabel(tx.type, t)}
            </span>
            <span className={`col-span-2 justify-self-start font-bold sm:col-span-1 sm:justify-self-auto ${color}`}>
              {amount}
            </span>
          </div>
        );
      })}
    </div>
  );
}
