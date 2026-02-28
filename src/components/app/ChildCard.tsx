import { formatCents } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface ChildCardProps {
  child: {
    id: string;
    name: string;
    avatarEmoji: string;
    saldoCents: number;
    hasAllowanceRule?: boolean;
    savingGoals?: { id: string; title: string; targetCents: number }[];
  };
  currency: string;
  locale: string;
}

export async function ChildCard({ child, currency, locale }: ChildCardProps) {
  const t = await getTranslations("dashboard");
  const isPositive = child.saldoCents >= 0;

  const topGoal = child.savingGoals?.[0];
  const goalProgress = topGoal
    ? Math.min(100, Math.max(0, (child.saldoCents / topGoal.targetCents) * 100))
    : null;

  return (
    <div className="card-hover group rounded-2xl border border-border/50 bg-bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-2xl">
          {child.avatarEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-text-primary">
            {child.name}
          </h3>
          <p
            className={`text-xl font-extrabold tabular-nums ${
              isPositive ? "text-success" : "text-danger"
            }`}
          >
            {formatCents(child.saldoCents, currency, locale)}
          </p>
        </div>
      </div>

      {/* Saving goal mini-bar */}
      {topGoal && goalProgress !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-text-muted">
            <span className="truncate">{topGoal.title}</span>
            <span className="ml-2 font-medium">{Math.round(goalProgress)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border-light">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {child.hasAllowanceRule && (
          <span className="rounded-full bg-success-light px-2 py-0.5 text-xs font-medium text-success">
            {t("allowanceActive")}
          </span>
        )}
        {child.savingGoals && child.savingGoals.length > 0 && (
          <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
            {t("savingGoalCount", { count: child.savingGoals.length })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2 border-t border-border-light pt-4">
        <Link
          href={`/children/${child.id}`}
          className="flex-1 rounded-lg bg-bg-app py-2 text-center text-sm font-medium text-text-primary transition-colors hover:bg-border"
        >
          {t("viewDetails")}
        </Link>
        <Link
          href={`/children/${child.id}?action=add-transaction`}
          className="flex-1 rounded-lg bg-accent/10 py-2 text-center text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          {t("addTransaction")}
        </Link>
      </div>
    </div>
  );
}
