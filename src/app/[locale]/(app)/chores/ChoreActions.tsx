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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountEur = parseFloat(formData.get("reward") as string);
    const childId = formData.get("childId") as string;

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

    // Assign to child if selected
    if (childId) {
      await fetch(`/api/chores/${chore.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childAccountId: childId }),
      });
    }

    setLoading(false);
    setShowAdd(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setShowAdd(true)}>{t("addChore")}</Button>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title={t("addChore")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <Input id="title" name="title" label="Titel" required maxLength={100} />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
              Beschreibung
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
            <label htmlFor="childId" className="block text-sm font-medium text-text-secondary">
              {t("assign")}
            </label>
            <select
              id="childId"
              name="childId"
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">-- Optional --</option>
              {childAccounts.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.avatarEmoji} {child.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
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
