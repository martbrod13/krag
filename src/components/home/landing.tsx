import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { CareCircle } from "@/components/home/care-circle";
import {
  CalendarIcon,
  GlobeIcon,
  PhoneIcon,
  ShieldIcon,
  TabletIcon,
} from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PanelLink } from "@/components/panel-link";
import { ButtonLink } from "@/components/ui/button";

const steps = ["create", "invite", "pair"] as const;

const features = [
  { key: "plan", icon: <CalendarIcon className="size-7" /> },
  { key: "senior", icon: <TabletIcon className="size-7" /> },
  { key: "numbers", icon: <PhoneIcon className="size-7" /> },
  { key: "languages", icon: <GlobeIcon className="size-7" /> },
] as const;

const promises = ["noAds", "eu", "log", "control"] as const;

/** The start page for people who are not signed in: what Krąg is and how it works. */
export function Landing() {
  const t = useTranslations("Home");
  const common = useTranslations("Common");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 pt-6 pb-12 md:gap-24 md:pt-10">
      <div className="flex items-center gap-2 text-xl font-extrabold">
        <Logo className="size-9" />
        {common("appName")}
      </div>

      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start gap-6">
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-xl text-muted">{t("lead")}</p>
          <div className="flex flex-col items-start gap-3">
            <ButtonLink href="/logowanie" size="lg">
              {t("signIn")}
            </ButtonLink>
            <p className="text-muted">{t("signInHint")}</p>
          </div>
        </div>
        <CareCircle />
      </section>

      <section aria-labelledby="how" className="flex flex-col gap-8">
        <h2 id="how" className="text-3xl font-extrabold tracking-tight">
          {t("howTitle")}
        </h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-4 md:flex-col">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
                {index + 1}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-xl font-extrabold">
                  {t(`steps.${step}.title`)}
                </span>
                <span className="text-lg text-muted">
                  {t(`steps.${step}.text`)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="inside" className="flex flex-col gap-8">
        <h2 id="inside" className="text-3xl font-extrabold tracking-tight">
          {t("featuresTitle")}
        </h2>
        <ul className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.key} className="flex gap-4">
              <span className="text-brand">{feature.icon}</span>
              <span className="flex flex-col gap-1">
                <span className="text-xl font-extrabold">
                  {t(`features.${feature.key}.title`)}
                </span>
                <span className="text-lg text-muted">
                  {t(`features.${feature.key}.text`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-lg text-muted">{t("soon")}</p>
      </section>

      <section
        aria-labelledby="privacy"
        className="flex flex-col gap-6 rounded-card bg-brand-strong p-6 text-white md:flex-row md:gap-10 md:p-10"
      >
        <ShieldIcon className="size-10 shrink-0 text-brand-soft" />
        <div className="flex flex-col gap-4">
          <h2 id="privacy" className="text-2xl font-extrabold md:text-3xl">
            {t("privacyTitle")}
          </h2>
          <ul className="grid gap-x-10 gap-y-3 text-lg md:grid-cols-2">
            {promises.map((promise) => (
              <li key={promise} className="text-brand-soft">
                {t(`privacy.${promise}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="grid gap-10 md:grid-cols-2 md:items-end">
        <PanelLink
          href="/senior"
          title={t("seniorDevice.title")}
          description={t("seniorDevice.description")}
        />
        <LanguageSwitcher />
      </footer>
    </main>
  );
}
