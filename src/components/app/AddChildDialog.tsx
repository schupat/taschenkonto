"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AddChildDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = ["🧒", "👧", "👦", "🧒🏻", "👧🏽", "👦🏿", "🦸", "🧚", "🐱", "🐶"];

export function AddChildDialog({ open, onClose }: AddChildDialogProps) {
  const t = useTranslations("children");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🧒");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        pin: formData.get("pin"),
        avatarEmoji: selectedAvatar,
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

  return (
    <Dialog open={open} onClose={onClose} title={tc("add") + " " + t("name")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Input
          id="name"
          name="name"
          label={t("name")}
          required
          maxLength={50}
        />

        <Input
          id="pin"
          name="pin"
          label={t("pin")}
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          required
          placeholder="1234"
        />
        <p className="text-xs text-text-muted -mt-3">{t("pinHelp")}</p>

        <div>
          <label className="block text-sm font-medium text-text-secondary">
            {t("avatar")}
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
