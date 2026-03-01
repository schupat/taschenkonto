"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

interface ChoreActionsProps {
  childAccounts: { id: string; name: string; avatarEmoji: string }[];
}

export function ChoreActions({ childAccounts }: ChoreActionsProps) {
  const t = useTranslations("chores");
  const tc = useTranslations("common");
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);

  function toggleChild(childId: string) {
    setSelectedChildren((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  }

  function handleClose() {
    setShowAdd(false);
    setError("");
    setSelectedChildren([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountEur = parseFloat(formData.get("reward") as string);

    // Create the chore
    const choreRes = await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description") || undefined,
        rewardCents: Math.round(amountEur * 100),
        recurrence: formData.get("recurrence") || "ONE_TIME",
      }),
    });

    if (!choreRes.ok) {
      setLoading(false);
      setError("Error creating chore");
      return;
    }

    const chore = await choreRes.json();

    // Assign to selected children
    if (selectedChildren.length > 0) {
      const assignRes = await fetch(`/api/chores/${chore.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childAccountIds: selectedChildren }),
      });
      if (!assignRes.ok) {
        setLoading(false);
        setError("Error assigning chore");
        return;
      }
    }

    setLoading(false);
    handleClose();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setShowAdd(true)}>{t("addChore")}</Button>

      <Dialog open={showAdd} onClose={handleClose} title={t("addChore")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <Input id="title" name="title" label={t("choreTitle")} required maxLength={100} />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
              {t("description")}
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <Input
            id="reward"
            name="reward"
            label={t("reward")}
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="2.00"
          />

          <div>
            <label htmlFor="recurrence" className="block text-sm font-medium text-text-secondary">
              {t("recurrence")}
            </label>
            <select
              id="recurrence"
              name="recurrence"
              defaultValue="ONE_TIME"
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="ONE_TIME">{t("oneTime")}</option>
              <option value="DAILY">{t("daily")}</option>
              <option value="WEEKLY">{t("weekly")}</option>
              <option value="MONTHLY">{t("monthly")}</option>
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-text-secondary">
              {t("assignTo")}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {childAccounts.map((child) => {
                const isSelected = selectedChildren.includes(child.id);
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => toggleChild(child.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-accent bg-accent-light text-accent"
                        : "border-border bg-bg-card text-text-secondary hover:border-accent/50"
                    }`}
                  >
                    <span>{child.avatarEmoji}</span>
                    <span>{child.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-text-muted">{t("assignHint")}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "..." : tc("save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
