"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Chore {
  assignmentId: string;
  title: string;
  rewardCents: number;
}

interface ChoreListProps {
  chores: Chore[];
  currency: string;
  locale?: string;
  onComplete: (assignmentId: string) => Promise<void>;
}

export function ChoreList({ chores, currency, locale = "de", onComplete }: ChoreListProps) {
  const t = useTranslations("chores");
  const kt = useTranslations("kiosk");
  const [completing, setCompleting] = useState<string | null>(null);

  const fmt = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });

  if (chores.length === 0) {
    return (
      <div className="py-2 text-kiosk-text-dim">
        {t("noChores")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-kiosk-text-dim">
        {">"} {kt("chores")}
      </div>
      {chores.map((chore) => (
        <div
          key={chore.assignmentId}
          className="flex flex-col gap-3 rounded border border-kiosk-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <span className="text-kiosk-text">{chore.title}</span>
            <span className="ml-0 block text-kiosk-amber sm:ml-2 sm:inline">
              {fmt.format(chore.rewardCents / 100)}
            </span>
          </div>
          <button
            onClick={async () => {
              setCompleting(chore.assignmentId);
              await onComplete(chore.assignmentId);
              setCompleting(null);
            }}
            disabled={completing === chore.assignmentId}
            className="w-full rounded border border-kiosk-text bg-kiosk-text/10 px-3 py-2 text-sm font-bold text-kiosk-text hover:bg-kiosk-text/20 active:scale-95 disabled:opacity-40 sm:w-auto sm:py-1"
          >
            {completing === chore.assignmentId ? "..." : t("markDone") + " ✓"}
          </button>
        </div>
      ))}
    </div>
  );
}
