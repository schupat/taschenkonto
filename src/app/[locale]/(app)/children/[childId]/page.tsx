import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getChildWithSaldo } from "@/lib/services/child-account.service";
import { getTransactions } from "@/lib/services/transaction.service";
import { getInvestments } from "@/lib/services/investment.service";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import { TransactionTable } from "@/components/app/TransactionTable";
import { InvestmentCard } from "@/components/app/InvestmentCard";
import { SavingGoalCard } from "@/components/app/SavingGoalCard";
import { ChildDetailActions } from "./ChildDetailActions";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; childId: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const session = await requireAuth();
  const { locale, childId } = await params;
  const resolvedSearchParams = await searchParams;
  const autoOpenTransaction = resolvedSearchParams.action === "add-transaction";
  const t = await getTranslations();

  const child = await getChildWithSaldo(childId, session.familyId);
  if (!child) notFound();

  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
  });
  const currency = family?.currency || "EUR";

  const transactions = await getTransactions(childId, session.familyId, {
    limit: 50,
  });

  const investments = await getInvestments(childId, session.familyId);

  const isPositive = child.saldoCents >= 0;

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-accent"
      >
        <span>&larr;</span> {t("common.back")}
      </Link>

      {/* Hero Section */}
      <div className="animate-fade-in-up mt-4 rounded-2xl border border-border/50 bg-bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light text-4xl">
              {child.avatarEmoji}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
                {child.name}
              </h1>
              <p
                className={`mt-0.5 text-3xl font-extrabold tabular-nums ${
                  isPositive ? "text-success" : "text-danger"
                }`}
              >
                {formatCents(child.saldoCents, currency, locale)}
              </p>
              <a
                href={`/${locale}/kiosk/login?family=${session.familyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 rounded-md bg-kiosk-bg px-2.5 py-1 font-mono text-xs text-kiosk-text transition-colors hover:bg-kiosk-bg/80"
              >
                {">"} {t("children.openInKiosk")}
              </a>
            </div>
          </div>
          <ChildDetailActions childId={childId} childName={child.name} childEmoji={child.avatarEmoji} currency={currency} locale={locale} autoOpenTransaction={autoOpenTransaction} saldoCents={child.saldoCents} />
        </div>
      </div>

      {/* Saving Goals */}
      {child.savingGoals.length > 0 && (
        <div className="animate-fade-in-up stagger-1 mt-6">
          <h2 className="text-lg font-bold text-text-primary">
            {t("savingGoals.title")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {child.savingGoals.map((goal) => (
              <SavingGoalCard
                key={goal.id}
                goal={{
                  id: goal.id,
                  title: goal.title,
                  targetCents: goal.targetCents,
                  targetDate: goal.targetDate?.toISOString() ?? null,
                }}
                childId={childId}
                saldoCents={child.saldoCents}
                currency={currency}
                locale={locale}
                formatCents={formatCents}
              />
            ))}
          </div>
        </div>
      )}

      {/* Investments */}
      <div className="animate-fade-in-up stagger-1 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {t("investments.title")}
          </h2>
          <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium tabular-nums text-accent">
            {investments.filter((i) => i.status !== "WITHDRAWN").length}
          </span>
        </div>
        {(() => {
          const lastInterestDate = investments
            .filter((i) => i.lastInterestAt)
            .sort((a, b) => new Date(b.lastInterestAt!).getTime() - new Date(a.lastInterestAt!).getTime())[0]
            ?.lastInterestAt;
          return lastInterestDate ? (
            <p className="mt-1 text-xs text-text-muted">
              {t("investments.lastInterestDate")}:{" "}
              {new Date(lastInterestDate).toLocaleDateString(
                locale === "de" ? "de-DE" : "en-US",
                { day: "2-digit", month: "2-digit", year: "numeric" }
              )}
            </p>
          ) : null;
        })()}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {investments
            .filter((i) => i.status !== "WITHDRAWN")
            .map((inv) => (
              <InvestmentCard
                key={inv.id}
                investment={{
                  ...inv,
                  startDate: inv.startDate.toISOString(),
                  maturityDate: inv.maturityDate?.toISOString() ?? null,
                }}
                currency={currency}
                locale={locale}
              />
            ))}
        </div>
        {investments.filter((i) => i.status !== "WITHDRAWN").length === 0 && (
          <p className="mt-3 text-sm text-text-muted">
            {t("investments.noInvestments")}
          </p>
        )}
      </div>

      {/* Transactions */}
      <div className="animate-fade-in-up stagger-2 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {t("transactions.title")}
          </h2>
          <span className="rounded-full bg-border-light px-2.5 py-0.5 text-xs font-medium tabular-nums text-text-muted">
            {transactions.length}
          </span>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border/50 bg-bg-card shadow-sm">
          <TransactionTable
            transactions={transactions.map((tx) => ({
              ...tx,
              createdAt: tx.createdAt.toISOString(),
            }))}
            currency={currency}
            locale={locale}
            showFilter
          />
        </div>
      </div>
    </div>
  );
}
