import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/app-header";
import { CircleCard } from "@/components/circle-card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ButtonLink } from "@/components/ui/button";
import type { MyCircle } from "@/lib/circles";

type MyCirclesProps = {
  name: string;
  circles: MyCircle[];
  /** Set right after the user deleted a circle. */
  circleDeleted: boolean;
};

/**
 * The start page after signing in: every circle with today's tasks, the
 * family's circles first, then the people the user looks after as a
 * caregiver.
 */
export function MyCircles({ name, circles, circleDeleted }: MyCirclesProps) {
  const t = useTranslations("MyCircles");
  const family = circles.filter((circle) => circle.role !== "CAREGIVER");
  const caregiving = circles.filter((circle) => circle.role === "CAREGIVER");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-2xl">
      <AppHeader signedIn />
      <main className="flex flex-1 flex-col gap-8 px-5 py-6">
        <h1 className="text-3xl font-extrabold">{t("greeting", { name })}</h1>

        {circleDeleted ? (
          <p
            role="status"
            className="rounded-2xl bg-brand-soft p-4 text-brand-strong"
          >
            {t("circleDeleted")}
          </p>
        ) : null}

        {family.length > 0 ? (
          <section aria-labelledby="family" className="flex flex-col gap-3">
            <h2 id="family" className="text-xl font-extrabold">
              {t("familyTitle")}
            </h2>
            {family.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </section>
        ) : null}

        {caregiving.length > 0 ? (
          <section aria-labelledby="caregiving" className="flex flex-col gap-3">
            <h2 id="caregiving" className="text-xl font-extrabold">
              {t("caregiverTitle")}
            </h2>
            {caregiving.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </section>
        ) : null}

        {/* Caregivers can start a circle too, e.g. for their own mother. */}
        <div className="flex flex-col gap-3">
          {circles.length === 0 ? (
            <p className="text-lg text-muted">{t("empty")}</p>
          ) : null}
          <ButtonLink
            href="/krag/nowy"
            size="lg"
            variant={circles.length === 0 ? "primary" : "secondary"}
          >
            {t("newCircle")}
          </ButtonLink>
        </div>

        <footer className="mt-auto pt-4">
          <LanguageSwitcher />
        </footer>
      </main>
    </div>
  );
}
