"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

interface ChoreAssignment {
  id: string;
  childAccount: { avatarEmoji: string; name: string };
}

interface ChoreCardProps {
  chore: {
    id: string;
    title: string;
    description: string | null;
    rewardCents: number;
    assignments: ChoreAssignment[];
  };
  currency: string;
  locale: string;
  formatCents: (cents: number, currency: string, locale: string) => string;
}

export function ChoreCard({ chore, currency, locale, formatCents }: ChoreCardProps) {
  const t = useTranslations("chores");
  const tc = useTranslations("common");
  const router = useRouter();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountEur = parseFloat(formData.get("reward") as string);

    const res = await fetch(`/api/chores/${chore.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description") || undefined,
        rewardCents: Math.round(amountEur * 100),
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
    const res = await fetch(`/api/chores/${chore.id}`, { method: "DELETE" });
    if (res.ok) {
      setShowDelete(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <>
      <div className="card-hover rounded-xl border border-border/50 bg-bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-text-primary">{chore.title}</h3>
            {chore.description && (
              <p className="mt-1 text-sm text-text-secondary">
                {chore.description}
              </p>
            )}
          </div>
          <div className="ml-3 flex items-center gap-2">
            <span className="rounded-full bg-success-light px-2.5 py-1 text-sm font-bold text-success">
              {formatCents(chore.rewardCents, currency, locale)}
            </span>
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-app hover:text-text-primary"
              title={t("editChore")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              title={t("deleteChore")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
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

      {/* Edit Dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title={t("editChore")}>
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            id={`edit-title-${chore.id}`}
            name="title"
            label={t("choreTitle")}
            required
            maxLength={100}
            defaultValue={chore.title}
          />
          <div>
            <label htmlFor={`edit-desc-${chore.id}`} className="block text-sm font-medium text-text-secondary">
              {t("description")}
            </label>
            <textarea
              id={`edit-desc-${chore.id}`}
              name="description"
              rows={2}
              maxLength={500}
              defaultValue={chore.description || ""}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <Input
            id={`edit-reward-${chore.id}`}
            name="reward"
            label={t("reward")}
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(chore.rewardCents / 100).toFixed(2)}
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
      <Dialog open={showDelete} onClose={() => setShowDelete(false)} title={t("deleteChore")}>
        <p className="text-sm text-text-secondary">{t("deleteChoreConfirm")}</p>
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
