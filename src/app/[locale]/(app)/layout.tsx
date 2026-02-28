import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-bg-app">
      {/* Sidebar */}
      <aside className="gradient-sidebar hidden w-64 flex-col text-white md:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <span className="text-2xl">🏦</span>
          <span className="text-lg font-bold tracking-tight">
            {t("common.appName")}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
          <NavLink href="/dashboard" icon="📊" label={t("dashboard.title")} />
          <NavLink href="/chores" icon="✅" label={t("chores.title")} />
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {session?.user?.name || t("common.parent")}
              </p>
              <p className="truncate text-xs text-white/50">
                {session?.user?.email}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="border-b border-border bg-bg-card px-6 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏦</span>
            <span className="text-lg font-bold text-text-primary">
              {t("common.appName")}
            </span>
          </div>
          <nav className="mt-2 flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1 text-sm font-medium text-text-secondary hover:bg-bg-app"
            >
              📊 {t("dashboard.title")}
            </Link>
            <Link
              href="/chores"
              className="rounded-lg px-3 py-1 text-sm font-medium text-text-secondary hover:bg-bg-app"
            >
              ✅ {t("chores.title")}
            </Link>
          </nav>
        </header>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
