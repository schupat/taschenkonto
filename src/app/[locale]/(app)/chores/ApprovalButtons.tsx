"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function ApprovalButtons({ completionId }: { completionId: string }) {
  const t = useTranslations("chores");
  const router = useRouter();

  async function handleApprove() {
    await fetch(`/api/chore-completions/${completionId}/approve`, {
      method: "POST",
    });
    router.refresh();
  }

  async function handleReject() {
    await fetch(`/api/chore-completions/${completionId}/reject`, {
      method: "POST",
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        className="rounded-lg bg-success/10 px-3 py-1.5 text-sm font-medium text-success transition-colors hover:bg-success/20"
      >
        {t("approve")}
      </button>
      <button
        onClick={handleReject}
        className="rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20"
      >
        {t("reject")}
      </button>
    </div>
  );
}
