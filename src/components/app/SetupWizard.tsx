"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CURRENCY_OPTIONS = ["EUR", "CHF", "USD", "GBP"] as const;
const AVATAR_OPTIONS = ["🧒", "👧", "👦", "🧒🏻", "👧🏽", "👦🏿", "🦸", "🧚", "🐱", "🐶"];

interface AddedChild {
  name: string;
  avatarEmoji: string;
}

interface SetupWizardProps {
  open: boolean;
  familyName: string;
  currency: string;
}

export function SetupWizard({ open, familyName, currency }: SetupWizardProps) {
  const t = useTranslations("setup");
  const tc = useTranslations("children");
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(familyName);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [addedChildren, setAddedChildren] = useState<AddedChild[]>([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childError, setChildError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🧒");
  const [finishing, setFinishing] = useState(false);

  async function markSetupComplete() {
    await fetch("/api/family/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        currency: selectedCurrency,
        setupCompleted: true,
      }),
    });
    router.refresh();
  }

  async function handleSkip() {
    await markSetupComplete();
  }

  async function handleAddChild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChildError("");
    setChildLoading(true);

    const formData = new FormData(e.currentTarget);
    const childName = formData.get("childName") as string;

    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: childName,
        pin: formData.get("childPin"),
        avatarEmoji: selectedAvatar,
      }),
    });

    setChildLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setChildError(data.error || "Error");
      return;
    }

    setAddedChildren((prev) => [
      ...prev,
      { name: childName, avatarEmoji: selectedAvatar },
    ]);
    setSelectedAvatar("🧒");
    e.currentTarget.reset();
  }

  async function handleFinish() {
    setFinishing(true);
    await markSetupComplete();
  }

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      title={t("title")}
      className="max-w-lg"
    >
      <p className="text-sm text-text-secondary">{t("subtitle")}</p>
      <p className="mt-1 text-xs text-text-muted">
        {t("stepOf", { current: step, total: 2 })}
      </p>

      {/* Step indicator */}
      <div className="mt-3 flex gap-2">
        <div
          className={`h-1 flex-1 rounded-full transition-colors ${
            step >= 1 ? "bg-accent" : "bg-border"
          }`}
        />
        <div
          className={`h-1 flex-1 rounded-full transition-colors ${
            step >= 2 ? "bg-accent" : "bg-border"
          }`}
        />
      </div>

      {/* Step 1: Family */}
      {step === 1 && (
        <div className="mt-5 flex flex-col gap-4">
          <Input
            id="setup-family-name"
            label={t("familyNameLabel")}
            placeholder={t("familyNamePlaceholder")}
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label
              htmlFor="setup-currency"
              className="block text-sm font-medium text-text-secondary"
            >
              {t("currencyLabel")}
            </label>
            <select
              id="setup-currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              {t("skip")}
            </button>
            <Button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Children */}
      {step === 2 && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-sm text-text-secondary">{t("addChildPrompt")}</p>

          {/* Added children list */}
          {addedChildren.length > 0 && (
            <div className="flex flex-col gap-2">
              {addedChildren.map((child, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
                >
                  <span className="text-lg">{child.avatarEmoji}</span>
                  <span>{t("childAdded", { name: child.name })}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add child form */}
          <form onSubmit={handleAddChild} className="flex flex-col gap-3">
            {childError && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {childError}
              </div>
            )}

            <Input
              id="setup-child-name"
              name="childName"
              label={tc("name")}
              required
              maxLength={50}
            />

            <Input
              id="setup-child-pin"
              name="childPin"
              label={tc("pin")}
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              required
              placeholder="1234"
            />
            <p className="text-xs text-text-muted -mt-2">{tc("pinHelp")}</p>

            <div>
              <label className="block text-sm font-medium text-text-secondary">
                {tc("avatar")}
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`rounded-lg p-2 text-2xl transition-colors ${
                      selectedAvatar === emoji
                        ? "bg-accent/20 ring-2 ring-accent"
                        : "hover:bg-bg-app"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" variant="secondary" disabled={childLoading}>
              {childLoading
                ? "..."
                : addedChildren.length > 0
                  ? t("addAnotherChild")
                  : tc("add")}
            </Button>
          </form>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>
                {t("back")}
              </Button>
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                {t("skip")}
              </button>
            </div>
            <Button
              onClick={handleFinish}
              disabled={addedChildren.length === 0 || finishing}
            >
              {finishing ? "..." : t("finish")}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
