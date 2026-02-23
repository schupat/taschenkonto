import { formatCents } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { TopUpButton } from "@/components/app/TopUpButton";

interface InvestmentCardProps {
  investment: {
    id: string;
    type: string;
    status: string;
    principalCents: number;
    currentBalanceCents: number;
    interestRateBps: number;
    termMonths: number | null;
    startDate: string;
    maturityDate: string | null;
    withdrawalStatus?: string | null;
    childAccountId: string;
  };
  currency: string;
  locale: string;
}

export async function InvestmentCard({
  investment,
  currency,
  locale,
}: InvestmentCardProps) {
  const t = await getTranslations("investments");

  const earnedCents = investment.currentBalanceCents - investment.principalCents;
  const ratePercent = (investment.interestRateBps / 100).toFixed(2);

  const isTagesgeld = investment.type === "TAGESGELD";

  const typeBadgeClass = isTagesgeld
    ? "bg-accent-light text-accent"
    : "bg-warning-light text-warning";

  const statusBadgeClass =
    investment.status === "ACTIVE"
      ? "bg-success-light text-success"
      : investment.status === "MATURED"
        ? "bg-warning-light text-warning"
        : "bg-border-light text-text-muted";

  const statusLabel =
    investment.status === "ACTIVE"
      ? t("statusActive")
      : investment.status === "MATURED"
        ? t("statusMatured")
        : t("statusWithdrawn");

  const maturityFormatted = investment.maturityDate
    ? new Date(investment.maturityDate).toLocaleDateString(
        locale === "de" ? "de-DE" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric" }
      )
    : null;

  const startFormatted = new Date(investment.startDate).toLocaleDateString(
    locale === "de" ? "de-DE" : "en-US",
    { day: "2-digit", month: "2-digit", year: "numeric" }
  );

  return (
    <div className="card-hover rounded-xl border border-border/50 bg-bg-card p-4 shadow-sm">
      {/* Header row: type badge + status chip */}
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadgeClass}`}
        >
          {isTagesgeld ? t("tagesgeld") : t("festgeld")}
        </span>
        <div className="flex items-center gap-1.5">
          {investment.withdrawalStatus === "PENDING" && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              {t("withdrawalPending")}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Principal -> Current Value */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-sm text-text-secondary">
          {formatCents(investment.principalCents, currency, locale)}
        </span>
        <span className="text-text-muted">&rarr;</span>
        <span className="text-lg font-bold tabular-nums text-text-primary">
          {formatCents(investment.currentBalanceCents, currency, locale)}
        </span>
      </div>

      {/* Earned interest */}
      {earnedCents > 0 && (
        <p className="mt-1 text-xs font-medium text-success">
          +{formatCents(earnedCents, currency, locale)} {t("earnedInterest")}
        </p>
      )}

      {/* Top-up button for active Tagesgeld */}
      {isTagesgeld && investment.status === "ACTIVE" && (
        <div className="mt-3">
          <TopUpButton
            childId={investment.childAccountId}
            investmentId={investment.id}
            currency={currency}
            locale={locale}
          />
        </div>
      )}

      {/* Details */}
      <div className="mt-3 space-y-1 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>{t("interestRate")}</span>
          <span className="font-medium tabular-nums text-text-secondary">
            {ratePercent}% p.a.
          </span>
        </div>
        {!isTagesgeld && investment.termMonths && (
          <div className="flex justify-between">
            <span>{t("term")}</span>
            <span className="font-medium text-text-secondary">
              {t("termMonths", { months: investment.termMonths })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{t("startDate")}</span>
          <span className="font-medium text-text-secondary">
            {startFormatted}
          </span>
        </div>
        {!isTagesgeld && maturityFormatted && (
          <div className="flex justify-between">
            <span>{t("maturityDate")}</span>
            <span className="font-medium text-text-secondary">
              {maturityFormatted}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
