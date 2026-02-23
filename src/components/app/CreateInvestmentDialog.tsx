"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { getInvestmentProjection } from "@/lib/services/investment.service";
import { formatCents } from "@/lib/utils";

interface CreateInvestmentDialogProps {
  childId: string;
  currency: string;
  locale: string;
  saldoCents?: number;
}

export function CreateInvestmentDialog({
  childId,
  currency,
  locale,
  saldoCents,
}: CreateInvestmentDialogProps) {
  const t = useTranslations("investments");
  const tc = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<"TAGESGELD" | "FESTGELD">("TAGESGELD");
  const [amountEur, setAmountEur] = useState("");
  const [ratePercent, setRatePercent] = useState("3");
  const [termMonths, setTermMonths] = useState("");

  const amountCents = Math.round((parseFloat(amountEur) || 0) * 100);
  const rateBps = Math.round((parseFloat(ratePercent) || 0) * 100);
  const months = parseInt(termMonths, 10) || 0;

  // Compute a default preview term: for Tagesgeld use 12 months, for Festgeld use the entered term
  const previewMonths = type === "FESTGELD" ? months : 12;
  const isOverBudget = saldoCents !== undefined && amountCents > 0 && amountCents > saldoCents;

  const projection = useMemo(() => {
    if (amountCents <= 0 || rateBps <= 0 || previewMonths <= 0) return null;
    return getInvestmentProjection(amountCents, rateBps, previewMonths);
  }, [amountCents, rateBps, previewMonths]);

  const lastProjection = projection && projection.length > 0
    ? projection[projection.length - 1]
    : null;

  function resetForm() {
    setType("TAGESGELD");
    setAmountEur("");
    setRatePercent("3");
    setTermMonths("");
    setError("");
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, unknown> = {
      type,
      amountCents,
      interestRateBps: rateBps,
    };
    if (type === "FESTGELD") {
      body.termMonths = months;
    }

    const res = await fetch(`/api/children/${childId}/investments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.error === "Insufficient balance") {
        setError(t("insufficientBalance"));
      } else {
        setError(data.error || "Error");
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    handleClose();
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("createInvestment")}
      </Button>

      <Dialog open={open} onClose={handleClose} title={t("createInvestment")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {saldoCents !== undefined && (
            <div className="rounded-lg bg-bg-app px-3 py-2 text-sm text-text-secondary">
              {t("availableBalance")}:{" "}
              <span className="font-bold tabular-nums">
                {formatCents(saldoCents, currency, locale)}
              </span>
            </div>
          )}

          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              {t("type")}
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => { setType("TAGESGELD"); setRatePercent("3"); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  type === "TAGESGELD"
                    ? "bg-accent text-white"
                    : "bg-bg-app text-text-secondary hover:bg-border"
                }`}
              >
                {t("tagesgeld")}
              </button>
              <button
                type="button"
                onClick={() => { setType("FESTGELD"); setRatePercent("5"); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  type === "FESTGELD"
                    ? "bg-accent text-white"
                    : "bg-bg-app text-text-secondary hover:bg-border"
                }`}
              >
                {t("festgeld")}
              </button>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {type === "TAGESGELD" ? t("tagesgeldDesc") : t("festgeldDesc")}
            </p>
          </div>

          {/* Amount */}
          <Input
            id="investment-amount"
            name="amount"
            label={t("amount")}
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="50.00"
            value={amountEur}
            onChange={(e) => setAmountEur(e.target.value)}
          />

          {isOverBudget && (
            <p className="text-xs text-danger">{t("insufficientBalance")}</p>
          )}

          {/* Interest rate */}
          <Input
            id="investment-rate"
            name="rate"
            label={t("interestRate")}
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            placeholder="3.50"
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
          />

          {/* Term (Festgeld only) */}
          {type === "FESTGELD" && (
            <Input
              id="investment-term"
              name="term"
              label={t("term")}
              type="number"
              step="1"
              min="1"
              max="120"
              required
              placeholder="12"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
            />
          )}

          {/* Live projection preview */}
          {lastProjection && (
            <div className="rounded-lg border border-success/20 bg-success-light/50 p-3">
              <p className="text-xs font-medium text-text-secondary">
                {t("projection")}
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {t("afterMonths", { months: previewMonths })}:{" "}
                <span className="font-bold tabular-nums text-text-primary">
                  {formatCents(lastProjection.balanceCents, currency, locale)}
                </span>
              </p>
              <p className="mt-0.5 text-xs font-medium text-success">
                +{formatCents(
                  lastProjection.balanceCents - amountCents,
                  currency,
                  locale
                )}{" "}
                {t("totalInterest")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading || isOverBudget}>
              {loading ? "..." : tc("save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
