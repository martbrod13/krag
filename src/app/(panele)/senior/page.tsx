import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Senior");
  return { title: t("title") };
}

// The senior screen: huge text, one big button, nothing else.
export default function SeniorPage() {
  const t = useTranslations("Senior");

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 text-center">
      <h1 className="text-5xl font-extrabold">{t("greeting")}</h1>
      <Button size="xl" disabled className="w-full">
        {t("allOk")}
      </Button>
      <p className="text-lg text-muted">{t("preview")}</p>
    </div>
  );
}
