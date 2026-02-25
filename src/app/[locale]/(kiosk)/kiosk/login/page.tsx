"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { NumpadInput } from "@/components/kiosk/NumpadInput";
import { TerminalScreen } from "@/components/kiosk/TerminalScreen";

interface Child {
  id: string;
  name: string;
  avatarEmoji: string;
}

export default function KioskLoginPage() {
  const t = useTranslations("kiosk");
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get("family") ?? "";

  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<Child | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(!!familyId);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (!familyId) return;
    fetch(`/api/kiosk/children?family=${familyId}`)
      .then((r) => r.json())
      .then((data) => {
        setChildren(data);
        setTimeout(() => setShowWelcome(false), 1200);
      })
      .catch(() => setError("Error loading"))
      .finally(() => setLoadingChildren(false));
  }, [familyId]);

  async function handlePin(pin: string) {
    if (!selected) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/kiosk/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childAccountId: selected.id, pin }),
      });

      if (!res.ok) {
        setError(t("wrongPin"));
        setSubmitting(false);
        return;
      }

      router.push("/kiosk");
    } catch {
      setError("Error");
      setSubmitting(false);
    }
  }

  if (!familyId) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center">
        <div className="text-red-400 crt-glow">{">"} ERROR: No family ID</div>
        <p className="mt-2 text-sm text-kiosk-text-dim">
          Add ?family=FAMILY_ID to the URL
        </p>
      </div>
    );
  }

  // Boot splash
  if (showWelcome && loadingChildren) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
        <div className="space-y-2 text-center">
          <div className="boot-line crt-glow text-2xl font-bold">
            {">"} TASCHENKONTO TERMINAL
          </div>
          <div className="boot-line text-kiosk-text-dim" style={{ animationDelay: "0.3s" }}>
            {">"} Connecting to family vault...
          </div>
          <div className="mt-4 crt-flicker text-kiosk-text-dim">
            &#9608;
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Select child
  if (!selected) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="crt-glow text-3xl font-bold animate-fade-in-up">
            {t("welcome")}
          </h1>
          <p className="mt-3 text-kiosk-text-dim animate-fade-in-up stagger-1">
            {">"} {t("selectChild")}
          </p>
        </div>

        {loadingChildren ? (
          <div className="text-kiosk-text-dim crt-flicker">
            {">"} Loading accounts...
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5 animate-fade-in-up stagger-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelected(child)}
                className="kiosk-panel group flex flex-col items-center gap-3 rounded-xl border border-kiosk-border bg-kiosk-panel p-8 transition-all hover:border-kiosk-text hover:shadow-[0_0_20px_rgba(51,255,51,0.15)] active:scale-95"
              >
                <span className="text-6xl transition-transform group-hover:scale-110">
                  {child.avatarEmoji}
                </span>
                <span className="crt-glow text-lg font-bold">{child.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-kiosk-text-dim">
          {">"} Select your account to continue
        </div>
      </div>
    );
  }

  // Step 2: Enter PIN
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 animate-fade-in">
      <button
        onClick={() => {
          setSelected(null);
          setError("");
        }}
        className="text-sm text-kiosk-text-dim transition-colors hover:text-kiosk-text"
      >
        {"<"} {t("selectChild")}
      </button>

      <div className="text-center">
        <span className="text-6xl">{selected.avatarEmoji}</span>
        <h2 className="crt-glow mt-3 text-2xl font-bold">{selected.name}</h2>
      </div>

      <TerminalScreen title={t("enterPin")} className="w-full max-w-xs">
        <div className="flex flex-col items-center py-4">
          {error && (
            <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {">"} {error}
            </div>
          )}
          <NumpadInput onSubmit={handlePin} disabled={submitting} />
        </div>
      </TerminalScreen>
    </div>
  );
}
