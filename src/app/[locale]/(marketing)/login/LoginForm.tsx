"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(searchParams.get("verify") === "true");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError(t("loginError"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
        <div className="animate-scale-in w-full max-w-sm">
          <div className="rounded-2xl border border-border/50 bg-bg-card p-8 shadow-xl shadow-black/5 text-center">
            <span className="text-5xl">✉️</span>
            <h1 className="mt-4 text-2xl font-bold text-text-primary">
              {t("checkEmail")}
            </h1>
            <p className="mt-3 text-text-secondary">
              {t("checkEmailDetail", { email: email || "..." })}
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm text-accent hover:text-accent-hover underline underline-offset-2"
            >
              {t("resend")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="animate-scale-in w-full max-w-sm">
        <div className="rounded-2xl border border-border/50 bg-bg-card p-8 shadow-xl shadow-black/5">
          <div className="text-center">
            <span className="text-4xl">🏦</span>
            <h1 className="mt-3 text-2xl font-bold text-text-primary">
              {t("loginTitle")}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {t("loginSubtitle")}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-danger-light px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <Input
              id="email"
              name="email"
              type="email"
              label={t("email")}
              required
              placeholder="eltern@example.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" disabled={loading} className="mt-2 py-2.5">
              {loading ? "..." : t("loginButton")}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted">
            {t("newUser")}
          </p>
        </div>
      </div>
    </div>
  );
}
