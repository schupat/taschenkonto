"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

const AVATAR_OPTIONS = ["🧒", "👧", "👦", "🧒🏻", "👧🏽", "👦🏿", "🦸", "🧚", "🐱", "🐶"];

interface EditChildDialogProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  currentName: string;
  currentEmoji: string;
}

export function EditChildDialog({
  open,
  onClose,
  childId,
  currentName,
  currentEmoji,
}: EditChildDialogProps) {
  const tc = useTranslations("common");
  const cd = useTranslations("children");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);

  function handleClose() {
    onClose();
    setError("");
    setSelectedEmoji(currentEmoji);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/children/${childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        avatarEmoji: selectedEmoji,
      }),
    });

    if (!res.ok) {
      setError("Error");
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={handleClose} title={cd("editChild")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Input
          id="edit-child-name"
          name="name"
          label={cd("name")}
          required
          maxLength={50}
          defaultValue={currentName}
        />

        <div>
          <span className="block text-sm font-medium text-text-secondary">
            {cd("avatar")}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                  selectedEmoji === emoji
                    ? "bg-accent-light ring-2 ring-accent"
                    : "bg-bg-app hover:bg-border"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
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
