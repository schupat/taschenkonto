import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await requireAuth();
  const t = await getTranslations("settings");

  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
    select: {
      name: true,
      currency: true,
      kioskInvestmentsEnabled: true,
    },
  });

  if (!family) {
    return null;
  }

  return (
    <div>
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
          {t("title")}
        </h1>
      </div>

      <div className="animate-fade-in-up stagger-1 mt-6 max-w-lg">
        <div className="rounded-2xl border border-border/50 bg-bg-card p-6 shadow-sm">
          <SettingsForm
            familyName={family.name}
            currency={family.currency}
            kioskInvestmentsEnabled={family.kioskInvestmentsEnabled}
          />
        </div>
      </div>
    </div>
  );
}
