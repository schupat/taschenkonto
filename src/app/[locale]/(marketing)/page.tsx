import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LandingPage() {
  const t = useTranslations("marketing");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
          <div className="animate-fade-in-up">
            <span className="inline-block rounded-full border border-accent/20 bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
              Open Source Family Finance
            </span>
          </div>

          <h1 className="animate-fade-in-up stagger-1 mt-8 text-5xl font-extrabold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            {t("hero")}
          </h1>

          <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-2xl text-lg text-text-secondary sm:text-xl">
            {t("subtitle")}
          </p>

          <div className="animate-fade-in-up stagger-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="animate-pulse-glow rounded-full bg-accent px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30"
            >
              {t("cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-bg-app py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              emoji="💰"
              title="Taschengeld"
              description="Automatische Auszahlung nach Zeitplan. Wöchentlich, monatlich — du entscheidest."
            />
            <FeatureCard
              emoji="✨"
              title="Aufgaben & Belohnungen"
              description="Kinder erledigen Aufgaben, Eltern bestätigen — das Geld wird automatisch gutgeschrieben."
            />
            <FeatureCard
              emoji="🎯"
              title="Sparziele"
              description="Kinder setzen sich Ziele und sehen ihren Fortschritt in Echtzeit."
            />
            <FeatureCard
              emoji="🖥️"
              title="Retro-Kiosk"
              description="Kinder checken ihr Guthaben am CRT-Terminal — cooler geht's nicht."
            />
            <FeatureCard
              emoji="📊"
              title="CSV-Export"
              description="Alle Buchungen als CSV exportieren. Perfekt für die Übersicht."
            />
            <FeatureCard
              emoji="🔒"
              title="PIN-Login"
              description="Jedes Kind hat seinen eigenen PIN. Sicher und einfach."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-white py-8 text-center text-sm text-text-muted">
        <p>KidsVault — Open Source</p>
      </footer>
    </>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card-hover rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
      <span className="text-3xl">{emoji}</span>
      <h3 className="mt-4 text-lg font-bold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
