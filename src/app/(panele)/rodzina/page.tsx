import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CircleCard } from "@/components/circle-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMyCircles } from "@/lib/circles";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Family");
  return { title: t("title") };
}

export default async function FamilyPage({
  searchParams,
}: PageProps<"/rodzina">) {
  const user = await requireUser("/rodzina");
  const circles = await getMyCircles(user.id);
  const t = await getTranslations("Family");
  const common = await getTranslations("Common");
  // Set after a coordinator deleted a circle (circle settings).
  const circleDeleted = (await searchParams).usunieto === "1";

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>

      {circleDeleted ? (
        <p
          role="status"
          className="rounded-2xl bg-brand-soft p-4 text-brand-strong"
        >
          {t("circleDeleted")}
        </p>
      ) : null}

      <section aria-labelledby="my-circles" className="flex flex-col gap-3">
        <h2 id="my-circles" className="text-xl font-extrabold">
          {t("circlesTitle")}
        </h2>
        {circles.length > 0 ? (
          circles.map((circle) => (
            <CircleCard key={circle.id} circle={circle} />
          ))
        ) : (
          <p className="text-lg text-muted">{t("noCircles")}</p>
        )}
        <ButtonLink
          href="/krag/nowy"
          size="lg"
          variant={circles.length > 0 ? "secondary" : "primary"}
        >
          {t("newCircle")}
        </ButtonLink>
      </section>

      <Card className="flex flex-col items-start gap-3">
        <Badge tone="info">{common("comingSoon")}</Badge>
        <p className="text-lg">{t("lead")}</p>
      </Card>
    </>
  );
}
