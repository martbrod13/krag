import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CircleCard } from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMyCircles } from "@/lib/circles";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Caregiver");
  return { title: t("title") };
}

export default async function CaregiverPage() {
  const user = await requireUser("/opiekun");
  const circles = await getMyCircles(user.id, "CAREGIVER");
  const t = await getTranslations("Caregiver");
  const common = await getTranslations("Common");

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>

      <section aria-labelledby="my-people" className="flex flex-col gap-3">
        <h2 id="my-people" className="text-xl font-extrabold">
          {t("peopleTitle")}
        </h2>
        {circles.length > 0 ? (
          circles.map((circle) => (
            <CircleCard key={circle.id} circle={circle} />
          ))
        ) : (
          <p className="text-lg text-muted">{t("noPeople")}</p>
        )}
      </section>

      <Card className="flex flex-col items-start gap-3">
        <Badge tone="info">{common("comingSoon")}</Badge>
        <p className="text-lg">{t("lead")}</p>
      </Card>
    </>
  );
}
