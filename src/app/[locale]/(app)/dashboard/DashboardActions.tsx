"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { AddChildDialog } from "@/components/app/AddChildDialog";

export function DashboardActions({ familyId }: { familyId?: string }) {
  const t = useTranslations("dashboard");
  const [showAddChild, setShowAddChild] = useState(false);

  return (
    <>
      <Button onClick={() => setShowAddChild(true)} className="shadow-md shadow-accent/20">
        + {t("addChild")}
      </Button>
      <AddChildDialog
        open={showAddChild}
        onClose={() => setShowAddChild(false)}
      />
    </>
  );
}
