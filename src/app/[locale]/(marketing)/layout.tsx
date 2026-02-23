import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen bg-bg-card">
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🏦</span>
            <span className="text-xl font-bold tracking-tight text-text-primary">
              KidsVault
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-md shadow-accent/25 transition-all duration-200 hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/30"
            >
              {t("login")}
            </Link>
          </nav>
        </div>
      </header>
      <main className="pt-14">{children}</main>
    </div>
  );
}
