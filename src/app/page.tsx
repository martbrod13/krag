import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PanelLink } from "@/components/panel-link";
import { SignOutButton } from "@/components/sign-out-button";
import { ButtonLink } from "@/components/ui/button";
import { getPairedDevice } from "@/lib/senior-device";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    // The senior's paired phone or tablet opens straight to the senior screen,
    // also from the icon on the home screen.
    const { device } = await getPairedDevice();
    if (device) redirect("/senior");
  }

  const t = await getTranslations("Home");
  const common = await getTranslations("Common");
  const name = session?.user.name.trim();

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

      {session ? (
        <section aria-labelledby="choose-panel" className="flex flex-col gap-3">
          {name ? (
            <p className="text-2xl font-extrabold">{t("greeting", { name })}</p>
          ) : null}
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
          <div className="pt-2">
            <SignOutButton />
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <ButtonLink href="/logowanie" size="lg">
            {t("signIn")}
          </ButtonLink>
          <p className="text-muted">{t("signInHint")}</p>
          <PanelLink
            href="/senior"
            title={t("senior.title")}
            description={t("senior.description")}
          />
        </section>
      )}

      <footer className="mt-auto flex flex-col gap-6">
        <LanguageSwitcher />
        <p className="text-sm text-muted">{t("foundationNote")}</p>
      </footer>
    </main>
  );
}
