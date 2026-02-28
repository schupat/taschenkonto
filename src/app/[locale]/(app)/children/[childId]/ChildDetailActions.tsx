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
import { ChangePinDialog } from "@/components/app/ChangePinDialog";
import { EditChildDialog } from "@/components/app/EditChildDialog";

interface ChildDetailActionsProps {
  childId: string;
  childName: string;
  childEmoji: string;
  currency: string;
  locale: string;
  autoOpenTransaction?: boolean;
  saldoCents?: number;
}

export function ChildDetailActions({
  childId,
  childName,
  childEmoji,
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
  const [showEditChild, setShowEditChild] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
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
    <div className="flex flex-col gap-3">
      {/* Primary actions */}
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
      </div>
      {/* Secondary actions */}
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" className="text-xs" onClick={() => setShowEditChild(true)}>
          {cd("editChild")}
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setShowChangePin(true)}>
          {cd("changePin")}
        </Button>
        <a
          href={`/api/children/${childId}/transactions/export`}
          className="rounded-lg px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-app hover:text-text-primary"
        >
          CSV ↓
        </a>
        <span className="mx-1 hidden text-border sm:inline">|</span>
        <Button variant="ghost" className="text-xs text-danger hover:text-danger" onClick={() => setShowDeleteConfirm(true)}>
          {cd("deleteChild")}
        </Button>
      </div>

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
      <EditChildDialog
        open={showEditChild}
        onClose={() => setShowEditChild(false)}
        childId={childId}
        currentName={childName}
        currentEmoji={childEmoji}
      />
      <ChangePinDialog
        open={showChangePin}
        onClose={() => setShowChangePin(false)}
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
