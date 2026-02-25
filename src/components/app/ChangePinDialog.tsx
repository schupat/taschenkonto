"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ChangePinDialogProps {
  open: boolean;
  onClose: () => void;
  childId: string;
}

export function ChangePinDialog({ open, onClose, childId }: ChangePinDialogProps) {
  const t = useTranslations("children");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const pin = formData.get("pin") as string;

    const res = await fetch(`/api/children/${childId}/pin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
      router.refresh();
    }, 1500);
  }

  function handleClose() {
    setError("");
    setSuccess(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title={t("changePin")}>
      {success ? (
        <div className="py-4 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-2 font-medium text-success">{t("pinChanged")}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <Input
            id="new-pin"
            name="pin"
            label={t("newPin")}
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            required
            placeholder="1234"
          />
          <p className="text-xs text-text-muted -mt-3">{t("pinHelp")}</p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "..." : tc("save")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
