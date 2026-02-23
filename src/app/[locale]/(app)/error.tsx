"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tc = useTranslations("common");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-bold text-text-primary">
        Etwas ist schiefgelaufen
      </h2>
      <Button onClick={reset}>{tc("back")}</Button>
    </div>
  );
}
