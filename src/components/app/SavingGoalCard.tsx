"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { formatCents } from "@/lib/utils";

interface SavingGoalCardProps {
  goal: {
    id: string;
    title: string;
    targetCents: number;
    targetDate: string | null;
  };
  childId: string;
  saldoCents: number;
  currency: string;
  locale: string;
}

export function SavingGoalCard({
  goal,
  childId,
  saldoCents,
  currency,
  locale,
}: SavingGoalCardProps) {
  const t = useTranslations("savingGoals");
  const tc = useTranslations("common");
  const router = useRouter();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const progress = Math.min(100, Math.max(0, (saldoCents / goal.targetCents) * 100));
  const progressColor =
    progress >= 100 ? "bg-success" : progress >= 50 ? "bg-accent" : "bg-warning";

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountEur = parseFloat(formData.get("target") as string);
    const targetDate = formData.get("targetDate") as string;

    const res = await fetch(`/api/children/${childId}/saving-goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        targetCents: Math.round(amountEur * 100),
        targetDate: targetDate || null,
      }),
    });

    if (!res.ok) {
      setError("Error");
      setLoading(false);
      return;
    }

    setLoading(false);
    setShowEdit(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/children/${childId}/saving-goals/${goal.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setShowDelete(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <div className="card-hover rounded-xl border border-border/50 bg-bg-card p-4 shadow-sm">
        <div className="flex justify-between">
          <span className="font-semibold text-text-primary">{goal.title}</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold ${
                progress >= 100 ? "text-success" : "text-text-secondary"
              }`}
            >
              {Math.round(progress)}%
            </span>
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-app hover:text-text-primary"
              title={t("editGoal")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              title={t("deleteGoal")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border-light">
          <div
            className={`h-full rounded-full ${progressColor} transition-all duration-700`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          <p className="text-xs text-text-muted">
            {formatCents(Math.max(saldoCents, 0), currency, locale)} /{" "}
            {formatCents(goal.targetCents, currency, locale)}
          </p>
          {goal.targetDate && (
            <p className="text-xs text-text-muted">
              {new Date(goal.targetDate).toLocaleDateString(
                locale === "de" ? "de-DE" : "en-US"
              )}
            </p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title={t("editGoal")}>
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            id={`edit-goal-title-${goal.id}`}
            name="title"
            label={t("goalTitle")}
            required
            maxLength={100}
            defaultValue={goal.title}
          />
          <Input
            id={`edit-goal-target-${goal.id}`}
            name="target"
            label={t("target")}
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(goal.targetCents / 100).toFixed(2)}
          />
          <Input
            id={`edit-goal-date-${goal.id}`}
            name="targetDate"
            label={t("targetDate")}
            type="date"
            defaultValue={goal.targetDate ? goal.targetDate.split("T")[0] : ""}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "..." : tc("save")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDelete} onClose={() => setShowDelete(false)} title={t("deleteGoal")}>
        <p className="text-sm text-text-secondary">{t("deleteGoalConfirm")}</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? "..." : tc("delete")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
