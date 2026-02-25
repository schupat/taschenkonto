import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LandingPage() {
  const t = useTranslations();

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
          <div className="animate-fade-in-up">
            <span className="inline-block rounded-full border border-accent/20 bg-accent-light px-4 py-1.5 text-sm font-medium text-accent">
              {t("marketing.badge")}
            </span>
          </div>

          <h1 className="animate-fade-in-up stagger-1 mt-8 text-5xl font-extrabold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            {t("marketing.hero")}
          </h1>

          <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-2xl text-lg text-text-secondary sm:text-xl">
            {t("marketing.subtitle")}
          </p>

          <div className="animate-fade-in-up stagger-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="animate-pulse-glow rounded-full bg-accent px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30"
            >
              {t("marketing.cta")}
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-border px-8 py-3.5 text-lg font-semibold text-text-secondary transition-all duration-200 hover:border-accent hover:text-accent"
            >
              {t("marketing.ctaDemo")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-border/50 bg-bg-app py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {t("marketing.howItWorksTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
            {t("marketing.howItWorksSubtitle")}
          </p>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            <StepCard
              step={1}
              emoji="👨‍👩‍👧‍👦"
              title={t("marketing.step1Title")}
              description={t("marketing.step1Desc")}
            />
            <StepCard
              step={2}
              emoji="💰"
              title={t("marketing.step2Title")}
              description={t("marketing.step2Desc")}
            />
            <StepCard
              step={3}
              emoji="🖥️"
              title={t("marketing.step3Title")}
              description={t("marketing.step3Desc")}
            />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="border-t border-border/50 bg-bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              {t("marketing.featuresTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
              {t("marketing.featuresSubtitle")}
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              emoji="💰"
              title={t("marketing.featureAllowanceTitle")}
              description={t("marketing.featureAllowanceDesc")}
            />
            <FeatureCard
              emoji="✨"
              title={t("marketing.featureChoresTitle")}
              description={t("marketing.featureChoresDesc")}
            />
            <FeatureCard
              emoji="🎯"
              title={t("marketing.featureSavingsTitle")}
              description={t("marketing.featureSavingsDesc")}
            />
            <FeatureCard
              emoji="🖥️"
              title={t("marketing.featureKioskTitle")}
              description={t("marketing.featureKioskDesc")}
            />
            <FeatureCard
              emoji="📊"
              title={t("marketing.featureExportTitle")}
              description={t("marketing.featureExportDesc")}
            />
            <FeatureCard
              emoji="🔒"
              title={t("marketing.featureSecurityTitle")}
              description={t("marketing.featureSecurityDesc")}
            />
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────── */}
      <section className="border-t border-border/50 bg-bg-app py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {t("marketing.benefitsTitle")}
          </h2>

          <div className="mt-14 grid gap-10 md:grid-cols-2">
            {/* Parents */}
            <div className="rounded-2xl border border-border/50 bg-bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👨‍👩‍👧</span>
                <h3 className="text-xl font-bold text-text-primary">
                  {t("marketing.forParents")}
                </h3>
              </div>
              <ul className="mt-6 space-y-4">
                <BenefitItem text={t("marketing.parentBenefit1")} />
                <BenefitItem text={t("marketing.parentBenefit2")} />
                <BenefitItem text={t("marketing.parentBenefit3")} />
                <BenefitItem text={t("marketing.parentBenefit4")} />
              </ul>
            </div>

            {/* Kids */}
            <div className="rounded-2xl border border-border/50 bg-bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧒</span>
                <h3 className="text-xl font-bold text-text-primary">
                  {t("marketing.forKids")}
                </h3>
              </div>
              <ul className="mt-6 space-y-4">
                <BenefitItem text={t("marketing.kidBenefit1")} />
                <BenefitItem text={t("marketing.kidBenefit2")} />
                <BenefitItem text={t("marketing.kidBenefit3")} />
                <BenefitItem text={t("marketing.kidBenefit4")} />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Taschenkonto ────────────────────────────────── */}
      <section className="border-t border-border/50 bg-bg-card py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              {t("marketing.whyTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
              {t("marketing.whySubtitle")}
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            <WhyCard
              emoji="🔓"
              title={t("marketing.whyOpenSourceTitle")}
              description={t("marketing.whyOpenSourceDesc")}
            />
            <WhyCard
              emoji="🏦"
              title={t("marketing.whyNoRealMoneyTitle")}
              description={t("marketing.whyNoRealMoneyDesc")}
            />
            <WhyCard
              emoji="🛡️"
              title={t("marketing.whyPrivacyTitle")}
              description={t("marketing.whyPrivacyDesc")}
            />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────── */}
      <section className="border-t border-border/50">
        <div className="gradient-cta px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t("marketing.bottomCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            {t("marketing.bottomCtaSubtitle")}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-accent shadow-lg transition-all duration-200 hover:bg-white/90 hover:shadow-xl"
          >
            {t("marketing.bottomCtaButton")}
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/50 bg-bg-card py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏦</span>
            <span className="text-sm font-semibold text-text-primary">
              Taschenkonto
            </span>
            <span className="hidden text-sm text-text-muted sm:inline">
              — {t("marketing.footerTagline")}
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-text-secondary">
            <a
              href="https://github.com/schupat/taschenkonto"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-text-primary"
            >
              {t("marketing.footerGithub")}
            </a>
            <span className="text-border">|</span>
            <span className="text-text-muted">
              {t("marketing.footerPrivacy")}
            </span>
            <span className="text-border">|</span>
            <span className="text-text-muted">
              {t("marketing.footerImprint")}
            </span>
          </nav>
        </div>
      </footer>
    </>
  );
}

/* ── Sub-Components ───────────────────────────────────────── */

function StepCard({
  step,
  emoji,
  title,
  description,
}: {
  step: number;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="step-badge">{step}</div>
      <span className="mt-4 text-3xl">{emoji}</span>
      <h3 className="mt-3 text-lg font-bold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
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
    <div className="card-hover rounded-2xl border border-border/50 bg-bg-app p-6 shadow-sm">
      <span className="text-3xl">{emoji}</span>
      <h3 className="mt-4 text-lg font-bold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-success">✓</span>
      <span className="text-sm text-text-secondary">{text}</span>
    </li>
  );
}

function WhyCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <span className="text-4xl">{emoji}</span>
      <h3 className="mt-4 text-lg font-bold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
