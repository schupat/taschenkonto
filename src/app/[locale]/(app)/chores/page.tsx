import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getChores, getPendingApprovals } from "@/lib/services/chore.service";
import { getChildrenWithSaldo } from "@/lib/services/child-account.service";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/utils";
import { ChoreActions } from "./ChoreActions";
import { ApprovalButtons } from "./ApprovalButtons";

export default async function ChoresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireAuth();
  const { locale } = await params;
  const t = await getTranslations();

  const [chores, pendingApprovals, children, family] = await Promise.all([
    getChores(session.familyId),
    getPendingApprovals(session.familyId),
    getChildrenWithSaldo(session.familyId),
    prisma.family.findUnique({ where: { id: session.familyId } }),
  ]);

  const currency = family?.currency || "EUR";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            {t("chores.title")}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {chores.length} {t("chores.title")} &middot; {pendingApprovals.length} {t("chores.pending")}
          </p>
        </div>
        <div className="animate-fade-in-up stagger-1">
          <ChoreActions
            childAccounts={children.map((c) => ({
              id: c.id,
              name: c.name,
              avatarEmoji: c.avatarEmoji,
            }))}
          />
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="animate-fade-in-up stagger-2 mt-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning-light text-xs font-bold text-warning">
              {pendingApprovals.length}
            </span>
            {t("chores.pending")}
          </h2>
          <div className="mt-3 grid gap-3">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="card-hover flex items-center justify-between rounded-xl border border-warning/20 bg-warning-light/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card text-xl shadow-sm">
                    {approval.assignment.childAccount.avatarEmoji}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">
                      {approval.assignment.chore.title}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {approval.assignment.childAccount.name} &middot;{" "}
                      <span className="font-medium text-success">
                        {formatCents(approval.assignment.chore.rewardCents, currency, locale)}
                      </span>
                    </p>
                  </div>
                </div>
                <ApprovalButtons completionId={approval.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chore List */}
      <div className="animate-fade-in-up stagger-3 mt-8">
        {chores.length === 0 ? (
          <div className="mt-8 text-center">
            <span className="text-5xl">✨</span>
            <p className="mt-4 text-text-muted">{t("chores.noChores")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {chores.map((chore) => (
              <div
                key={chore.id}
                className="card-hover rounded-xl border border-border/50 bg-bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-text-primary">{chore.title}</h3>
                    {chore.description && (
                      <p className="mt-1 text-sm text-text-secondary">
                        {chore.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-success-light px-2.5 py-1 text-sm font-bold text-success">
                    {formatCents(chore.rewardCents, currency, locale)}
                  </span>
                </div>
                {chore.assignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {chore.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent"
                      >
                        {a.childAccount.avatarEmoji} {a.childAccount.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
