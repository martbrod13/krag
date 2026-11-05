import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PanelLink } from "@/components/panel-link";

export default function HomePage() {
  const t = useTranslations("Home");
  const common = useTranslations("Common");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-4">
        <Logo className="size-14" />
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight">
            {common("appName")}
          </h1>
          <p className="text-lg text-muted">{t("lead")}</p>
        </div>
      </header>

      <section aria-labelledby="choose-panel" className="flex flex-col gap-3">
        <h2
          id="choose-panel"
          className="text-sm font-bold tracking-wide text-muted uppercase"
        >
          {t("choosePanel")}
        </h2>
        <PanelLink
          href="/rodzina"
          title={t("family.title")}
          description={t("family.description")}
        />
        <PanelLink
          href="/opiekun"
          title={t("caregiver.title")}
          description={t("caregiver.description")}
        />
        <PanelLink
          href="/senior"
          title={t("senior.title")}
          description={t("senior.description")}
        />
      </section>

      <footer className="mt-auto flex flex-col gap-6">
        <LanguageSwitcher />
        <p className="text-sm text-muted">{t("foundationNote")}</p>
      </footer>
    </main>
  );
}
