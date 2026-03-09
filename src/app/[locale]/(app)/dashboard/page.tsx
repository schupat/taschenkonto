import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getChildrenWithSaldo } from "@/lib/services/child-account.service";
import { getPendingApprovals } from "@/lib/services/chore.service";
import { getPendingWithdrawals } from "@/lib/services/investment.service";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import { ChildCard } from "@/components/app/ChildCard";
import { ApprovalButtons } from "../chores/ApprovalButtons";
import { WithdrawalApprovalButtons } from "@/components/app/WithdrawalApprovalButtons";
import { DashboardActions } from "./DashboardActions";
import { SetupWizard } from "@/components/app/SetupWizard";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireAuth();
  const { locale } = await params;
  const t = await getTranslations("dashboard");

  const children = await getChildrenWithSaldo(session.familyId);
  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
  });
  const currency = family?.currency || "EUR";

  const totalSaldo = children.reduce((sum, c) => sum + c.saldoCents, 0);
  const totalGoals = children.reduce(
    (sum, c) => sum + c.savingGoals.length,
    0
  );

  // Total invested across all active investments in this family
  const investedResult = await prisma.investment.aggregate({
    where: { familyId: session.familyId, status: { in: ["ACTIVE", "MATURED"] } },
    _sum: { currentBalanceCents: true },
  });
  const totalInvested = investedResult._sum.currentBalanceCents ?? 0;

  const pendingApprovals = await getPendingApprovals(session.familyId);
  const pendingWithdrawals = await getPendingWithdrawals(session.familyId);

  const needsSetup = !family?.setupCompleted && children.length === 0;

  return (
    <div>
      {needsSetup && (
        <SetupWizard
          open
          familyName={family?.name || ""}
          currency={currency}
        />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          className="animate-fade-in-up"
          eyebrow={t("family")}
          title={t("title")}
          description={family?.name || t("family")}
        />
        <div className="animate-fade-in-up stagger-1">
          <DashboardActions />
        </div>
      </div>

      {/* Stats Row */}
      <div className="animate-fade-in-up stagger-2 mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalBalance")}
          value={formatCents(totalSaldo, currency, locale)}
          accent="accent"
          positive={totalSaldo >= 0}
        />
        <StatCard
          label={t("totalInvested")}
          value={formatCents(totalInvested, currency, locale)}
          accent="success"
        />
        <StatCard
          label={t("children")}
          value={String(children.length)}
          accent="warning"
        />
        <StatCard
          label={t("savingGoals")}
          value={String(totalGoals)}
          accent="warning"
        />
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="animate-fade-in-up stagger-3 mt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/10 text-xs font-bold text-warning">
              {pendingApprovals.length}
            </span>
            {t("pendingApprovals")}
          </h2>
          <div className="mt-3 grid gap-3">
            {pendingApprovals.map((approval) => (
              <Card
                key={approval.id}
                className="flex items-center justify-between border-warning/20 bg-warning/5"
                padding="md"
                interactive
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card text-xl shadow-sm">
                    {approval.assignment.childAccount.avatarEmoji}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">
                      {approval.assignment.childAccount.name}{" "}
                      {t("completedChore")}{" "}
                      &ldquo;{approval.assignment.chore.title}&rdquo;
                    </p>
                    <p className="text-sm font-medium text-success">
                      {formatCents(approval.assignment.chore.rewardCents, currency, locale)}
                    </p>
                  </div>
                </div>
                <ApprovalButtons completionId={approval.id} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Withdrawal Requests */}
      {pendingWithdrawals.length > 0 && (
        <div className="animate-fade-in-up stagger-3 mt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
              {pendingWithdrawals.length}
            </span>
            {t("pendingWithdrawals")}
          </h2>
          <div className="mt-3 grid gap-3">
            {pendingWithdrawals.map((inv) => (
              <Card
                key={inv.id}
                className="flex items-center justify-between border-accent/20 bg-accent/5"
                padding="md"
                interactive
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card text-xl shadow-sm">
                    {inv.childAccount.avatarEmoji}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">
                      {inv.childAccount.name}: {t("withdrawInvestment", { type: inv.type === "TAGESGELD" ? "Tagesgeld" : "Festgeld" })}
                    </p>
                    <p className="text-sm font-medium text-accent">
                      {formatCents(inv.currentBalanceCents, currency, locale)}
                    </p>
                  </div>
                </div>
                <WithdrawalApprovalButtons investmentId={inv.id} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Children Grid */}
      {children.length === 0 ? (
        <div className="animate-fade-in mt-16 text-center">
          <span className="text-6xl">👶</span>
          <p className="mt-4 text-lg text-text-muted">{t("addChild")}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((child, i) => (
            <div
              key={child.id}
              className={`animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
            >
              <ChildCard child={child} currency={currency} locale={locale} />
            </div>
          ))}
        </div>
      )}

      {/* Kiosk Link */}
      {children.length > 0 && (
        <Card className="animate-fade-in-up stagger-4 mt-10 overflow-hidden border-accent/15" padding="lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Kiosk
              </p>
              <h2 className="mt-2 text-xl font-bold text-text-primary">
                {t("openKiosk")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Retro CRT Terminal
              </p>
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-bg-app px-3 py-1.5 text-xs text-text-muted">
                <span className="font-mono truncate">
                  /kiosk/login?family={session.familyId}
                </span>
              </div>
            </div>

            <Link
              href={`/kiosk/login?family=${session.familyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {t("openKiosk")}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  positive,
}: {
  label: string;
  value: string;
  accent: "accent" | "success" | "warning" | "danger";
  positive?: boolean;
}) {
  const colors: Record<string, string> = {
    accent: "stat-card-accent",
    success: "stat-card-success",
    warning: "stat-card-warning",
    danger: "stat-card-danger",
  };

  return (
    <Card
      // eslint-disable-next-line security/detect-object-injection
      className={`stat-card ${colors[accent]}`}
      padding="md"
    >
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p
        className={`mt-1 text-2xl font-extrabold tabular-nums ${
          positive === false ? "text-danger" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
