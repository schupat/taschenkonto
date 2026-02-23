"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("loginError"));
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="animate-scale-in w-full max-w-sm">
        <div className="rounded-2xl border border-border/50 bg-white p-8 shadow-xl shadow-black/5">
          <div className="text-center">
            <span className="text-4xl">🏦</span>
            <h1 className="mt-3 text-2xl font-bold text-text-primary">
              {t("loginTitle")}
            </h1>
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
              placeholder="demo@kidsvault.app"
            />

            <Input
              id="password"
              name="password"
              type="password"
              label={t("password")}
              required
              minLength={6}
              placeholder="••••••••"
            />

            <Button type="submit" disabled={loading} className="mt-2 py-2.5">
              {loading ? "..." : t("loginButton")}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Demo: demo@kidsvault.app / demo1234
        </p>
      </div>
    </div>
  );
}
