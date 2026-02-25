"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { formatCents } from "@/lib/utils";

interface AllowanceRule {
  id: string;
  amountCents: number;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  isActive: boolean;
}

interface AllowanceDialogProps {
  childId: string;
  currency: string;
  locale: string;
}

export function AllowanceDialog({ childId, currency, locale }: AllowanceDialogProps) {
  const t = useTranslations("allowance");
  const tc = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const [existingRule, setExistingRule] = useState<AllowanceRule | null>(null);
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [amountEur, setAmountEur] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const amountCents = Math.round((parseFloat(amountEur) || 0) * 100);

  const dayNames: Record<number, string> = {
    1: t("monday"),
    2: t("tuesday"),
    3: t("wednesday"),
    4: t("thursday"),
    5: t("friday"),
    6: t("saturday"),
    0: t("sunday"),
  };

  async function handleOpen() {
    setOpen(true);
    setFetching(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${childId}/allowance-rules`);
      const rules: AllowanceRule[] = await res.json();
      const active = rules.find((r) => r.isActive);
      if (active) {
        setExistingRule(active);
        setAmountEur((active.amountCents / 100).toFixed(2));
        setFrequency(active.frequency as "WEEKLY" | "MONTHLY");
        if (active.dayOfWeek !== null) setDayOfWeek(active.dayOfWeek);
        if (active.dayOfMonth !== null) setDayOfMonth(active.dayOfMonth);
      } else {
        setExistingRule(null);
        setAmountEur("");
        setFrequency("MONTHLY");
        setDayOfWeek(1);
        setDayOfMonth(1);
      }
    } catch {
      setError("Failed to load");
    } finally {
      setFetching(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setExistingRule(null);
    setAmountEur("");
    setError("");
    setShowDeleteConfirm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, unknown> = {
      amountCents,
      frequency,
    };
    if (frequency === "WEEKLY") body.dayOfWeek = dayOfWeek;
    if (frequency === "MONTHLY") body.dayOfMonth = dayOfMonth;

    try {
      if (existingRule) {
        // Update existing: only amountCents can be changed via PATCH
        const res = await fetch(
          `/api/children/${childId}/allowance-rules/${existingRule.id}`,
          {
            method: "PATCH",
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
      } else {
        // Create new
        const res = await fetch(`/api/children/${childId}/allowance-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Error");
          setLoading(false);
          return;
        }
      }
      setLoading(false);
      handleClose();
      router.refresh();
    } catch {
      setError("Error");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!existingRule) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/children/${childId}/allowance-rules/${existingRule.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        handleClose();
        router.refresh();
      }
    } catch {
      setError("Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={handleOpen}>
        {t("setupAllowance")}
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        title={existingRule ? t("editAllowance") : t("setupAllowance")}
      >
        {fetching ? (
          <p className="text-sm text-text-muted">{tc("loading")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            {existingRule && (
              <div className="rounded-lg bg-success-light/50 border border-success/20 px-3 py-2 text-sm text-text-secondary">
                {t("currentRule")}:{" "}
                <span className="font-bold">
                  {formatCents(existingRule.amountCents, currency, locale)}
                </span>{" "}
                {existingRule.frequency === "WEEKLY" ? t("perWeek") : t("perMonth")}
              </div>
            )}

            {/* Amount */}
            <Input
              id="allowance-amount"
              name="amount"
              label={t("amount")}
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="5.00"
              value={amountEur}
              onChange={(e) => setAmountEur(e.target.value)}
            />

            {/* Frequency toggle — only for new rules */}
            {!existingRule && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    {t("frequency")}
                  </label>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFrequency("WEEKLY")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        frequency === "WEEKLY"
                          ? "bg-accent text-white"
                          : "bg-bg-app text-text-secondary hover:bg-border"
                      }`}
                    >
                      {t("weekly")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequency("MONTHLY")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        frequency === "MONTHLY"
                          ? "bg-accent text-white"
                          : "bg-bg-app text-text-secondary hover:bg-border"
                      }`}
                    >
                      {t("monthly")}
                    </button>
                  </div>
                </div>

                {/* Day selection */}
                {frequency === "WEEKLY" && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      {t("dayOfWeek")}
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary"
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <option key={d} value={d}>
                          {/* eslint-disable-next-line security/detect-object-injection */}
                          {dayNames[d]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {frequency === "MONTHLY" && (
                  <Input
                    id="allowance-day"
                    name="dayOfMonth"
                    label={t("dayOfMonth")}
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={String(dayOfMonth)}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  />
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <div>
                {existingRule && (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-danger">{t("deleteRuleConfirm")}</span>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleDelete}
                        disabled={loading}
                      >
                        {tc("delete")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        {tc("cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-danger hover:text-danger"
                    >
                      {t("deleteRule")}
                    </Button>
                  )
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={loading || amountCents <= 0}>
                  {loading ? "..." : tc("save")}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
