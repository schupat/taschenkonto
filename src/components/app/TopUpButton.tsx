"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

interface TopUpButtonProps {
  childId: string;
  investmentId: string;
  currency: string;
  locale: string;
}

export function TopUpButton({ childId, investmentId, currency, locale }: TopUpButtonProps) {
  const t = useTranslations("investments");
  const tc = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [amountEur, setAmountEur] = useState("");

  const amountCents = Math.round((parseFloat(amountEur) || 0) * 100);

  function handleClose() {
    setOpen(false);
    setAmountEur("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amountCents <= 0) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/children/${childId}/investments/${investmentId}/topup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error");
        setLoading(false);
        return;
      }
      setLoading(false);
      handleClose();
      router.refresh();
    } catch {
      setError("Error");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
      >
        {t("topUp")}
      </button>

      <Dialog open={open} onClose={handleClose} title={t("topUp")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            id="topup-amount"
            name="amount"
            label={t("topUpAmount")}
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="5.00"
            value={amountEur}
            onChange={(e) => setAmountEur(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading || amountCents <= 0}>
              {loading ? "..." : tc("save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
