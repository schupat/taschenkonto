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
      <div className="flex items-start justify-between">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary lg:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-text-secondary">
            {family?.name || t("family")}
          </p>
        </div>
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
              <div
                key={approval.id}
                className="card-hover flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 p-4"
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
              </div>
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
              <div
                key={inv.id}
                className="card-hover flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 p-4"
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
              </div>
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
        <a
          href={`/kiosk/login?family=${session.familyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="animate-fade-in-up stagger-4 mt-10 block rounded-2xl border border-kiosk-border bg-kiosk-bg p-6 text-center transition-shadow hover:shadow-[0_0_30px_rgba(51,255,51,0.15)]"
        >
          <p className="font-mono text-sm text-kiosk-text-dim">
            {">"} KIOSK MODE
          </p>
          <p className="mt-2 font-mono text-kiosk-text crt-glow">
            /kiosk/login?family={session.familyId}
          </p>
          <p className="mt-3 text-xs text-kiosk-text-dim">
            {t("openKiosk")} — Retro CRT Terminal
          </p>
        </a>
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
    <div
      // eslint-disable-next-line security/detect-object-injection
      className={`stat-card ${colors[accent]} rounded-xl border border-border/50 p-5 shadow-sm`}
    >
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p
        className={`mt-1 text-2xl font-extrabold tabular-nums ${
          positive === false ? "text-danger" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
