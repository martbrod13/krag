import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Caregiver");
  return { title: t("title") };
}

export default function CaregiverPage() {
  const t = useTranslations("Caregiver");
  const common = useTranslations("Common");

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <Card className="flex flex-col items-start gap-3">
        <Badge tone="info">{common("comingSoon")}</Badge>
        <p className="text-lg">{t("lead")}</p>
      </Card>
    </>
  );
}
