"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

interface AddSavingGoalDialogProps {
  open: boolean;
  onClose: () => void;
  childId: string;
}

export function AddSavingGoalDialog({ open, onClose, childId }: AddSavingGoalDialogProps) {
  const t = useTranslations("savingGoals");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountEur = parseFloat(formData.get("target") as string);

    const res = await fetch(`/api/children/${childId}/saving-goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        targetCents: Math.round(amountEur * 100),
        targetDate: formData.get("targetDate") || undefined,
      }),
    });

    if (!res.ok) {
      setError("Error");
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} title={t("addGoal")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Input id="title" name="title" label={t("goalTitle")} required maxLength={100} />

        <Input
          id="target"
          name="target"
          label={t("target")}
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="50.00"
        />

        <Input
          id="targetDate"
          name="targetDate"
          label={t("targetDate")}
          type="date"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : tc("save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
