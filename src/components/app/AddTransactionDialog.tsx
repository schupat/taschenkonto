"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  childId: string;
}

export function AddTransactionDialog({
  open,
  onClose,
  childId,
}: AddTransactionDialogProps) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT">(
    "DEPOSIT"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountEur = parseFloat(formData.get("amount") as string);
    const amountCents = Math.round(amountEur * 100);

    const res = await fetch(`/api/children/${childId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents,
        type,
        description: formData.get("description"),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }

    onClose();
    router.refresh();
  }

  const typeOptions = [
    { value: "DEPOSIT" as const, label: t("deposit") },
    { value: "WITHDRAWAL" as const, label: t("withdrawal") },
    { value: "ADJUSTMENT" as const, label: t("adjustment") },
  ];

  return (
    <Dialog open={open} onClose={onClose} title={t("addTransaction")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary">
            {t("type")}
          </label>
          <div className="mt-1 flex gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === opt.value
                    ? "bg-accent text-white"
                    : "bg-bg-app text-text-secondary hover:bg-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          id="amount"
          name="amount"
          label={t("amount")}
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="5.00"
        />

        <Input
          id="description"
          name="description"
          label={t("description")}
          required
          maxLength={200}
          placeholder={type === "DEPOSIT" ? "Oma Geschenk" : "Eis"}
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
