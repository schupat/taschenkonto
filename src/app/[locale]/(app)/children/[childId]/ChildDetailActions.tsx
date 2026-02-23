"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { AddTransactionDialog } from "@/components/app/AddTransactionDialog";
import { AddSavingGoalDialog } from "@/components/app/AddSavingGoalDialog";
import { CreateInvestmentDialog } from "@/components/app/CreateInvestmentDialog";
import { AllowanceDialog } from "@/components/app/AllowanceDialog";

interface ChildDetailActionsProps {
  childId: string;
  currency: string;
  locale: string;
  autoOpenTransaction?: boolean;
  saldoCents?: number;
}

export function ChildDetailActions({
  childId,
  currency,
  locale,
  autoOpenTransaction,
  saldoCents,
}: ChildDetailActionsProps) {
  const t = useTranslations("transactions");
  const sg = useTranslations("savingGoals");
  const tc = useTranslations("common");
  const cd = useTranslations("children");
  const router = useRouter();

  const [showAddTransaction, setShowAddTransaction] = useState(autoOpenTransaction ?? false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/children/${childId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setShowAddTransaction(true)}>
        {t("addTransaction")}
      </Button>
      <Button variant="secondary" onClick={() => setShowAddGoal(true)}>
        {sg("addGoal")}
      </Button>
      <CreateInvestmentDialog
        childId={childId}
        currency={currency}
        locale={locale}
        saldoCents={saldoCents}
      />
      <AllowanceDialog
        childId={childId}
        currency={currency}
        locale={locale}
      />
      <a
        href={`/api/children/${childId}/transactions/export`}
        className="inline-flex items-center rounded-lg border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-app"
      >
        CSV ↓
      </a>
      <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
        {cd("deleteChild")}
      </Button>

      <AddTransactionDialog
        open={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        childId={childId}
      />
      <AddSavingGoalDialog
        open={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        childId={childId}
      />
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={cd("deleteChild")}
      >
        <p className="text-sm text-text-secondary">{cd("deleteConfirmMessage")}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "..." : cd("deleteChild")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
