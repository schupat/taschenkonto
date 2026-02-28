"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CURRENCY_OPTIONS = ["EUR", "CHF", "USD", "GBP"] as const;

interface SettingsFormProps {
  familyName: string;
  currency: string;
  kioskInvestmentsEnabled: boolean;
}

export function SettingsForm({
  familyName,
  currency,
  kioskInvestmentsEnabled,
}: SettingsFormProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [kioskEnabled, setKioskEnabled] = useState(kioskInvestmentsEnabled);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/family/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        currency: formData.get("currency"),
        kioskInvestmentsEnabled: kioskEnabled,
      }),
    });

    if (!res.ok) {
      setError("Error");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <Input
        id="family-name"
        name="name"
        label={t("familyName")}
        required
        maxLength={50}
        defaultValue={familyName}
      />

      <div>
        <label
          htmlFor="currency"
          className="block text-sm font-medium text-text-secondary"
        >
          {t("currency")}
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={currency}
          className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={kioskEnabled}
          onClick={() => setKioskEnabled(!kioskEnabled)}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            kioskEnabled ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              kioskEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <span className="text-sm font-medium text-text-primary">
            {t("kioskInvestments")}
          </span>
          <p className="text-xs text-text-muted">
            {t("kioskInvestmentsDesc")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "..." : tc("save")}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-success animate-fade-in-up">
            {t("saved")}
          </span>
        )}
      </div>
    </form>
  );
}
