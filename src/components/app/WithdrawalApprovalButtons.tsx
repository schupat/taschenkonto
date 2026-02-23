"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function WithdrawalApprovalButtons({ investmentId }: { investmentId: string }) {
  const t = useTranslations("investments");
  const router = useRouter();

  async function handleApprove() {
    await fetch(`/api/investments/${investmentId}/approve-withdrawal`, {
      method: "POST",
    });
    router.refresh();
  }

  async function handleReject() {
    await fetch(`/api/investments/${investmentId}/reject-withdrawal`, {
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
        {t("approveWithdrawal")}
      </button>
      <button
        onClick={handleReject}
        className="rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20"
      >
        {t("rejectWithdrawal")}
      </button>
    </div>
  );
}
