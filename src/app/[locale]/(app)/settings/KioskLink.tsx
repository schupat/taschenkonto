"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function KioskLink({ familyId }: { familyId: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  // Built client-side so no public base URL has to be configured.
  const [url, setUrl] = useState(`/kiosk/login?family=${familyId}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/kiosk/login?family=${familyId}`);
  }, [familyId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the input
      // below still shows the full link for manual copying.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-sm font-medium text-text-primary">
          {t("kioskLink")}
        </span>
        <p className="mt-1 text-xs text-text-muted">{t("kioskLinkDesc")}</p>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg-app px-3 py-2 font-mono text-xs text-text-secondary outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-app"
        >
          {copied ? tc("copied") : tc("copy")}
        </button>
      </div>
    </div>
  );
}
