import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { InstallButton } from "@/components/senior/install-app";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPairedDevice } from "@/lib/senior-device";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SeniorReady");
  return { title: t("title") };
}

// Right after pairing, while the family still holds the senior's device:
// how to put Krąg on the home screen and which language the screen speaks.
export default async function ReadyPage() {
  const { device } = await getPairedDevice();
  if (!device) redirect("/senior");

  const t = await getTranslations("SeniorReady");

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand text-white">
        <CheckIcon className="size-12" />
      </span>
      <h1 className="text-4xl font-extrabold">{t("title")}</h1>
      <p className="text-2xl">{t("lead")}</p>

      <Card className="flex flex-col gap-3 text-lg">
        <h2 className="text-xl font-extrabold">{t("installTitle")}</h2>
        <p>{t("installLead")}</p>
        <InstallButton label={t("installButton")} />
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>{t("android")}</li>
          <li>{t("iphone")}</li>
        </ul>
      </Card>

      <ButtonLink href="/senior" size="xl" className="w-full">
        {t("open")}
      </ButtonLink>
      <LanguageSwitcher />
    </div>
  );
}
