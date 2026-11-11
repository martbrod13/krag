import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { MyCircle } from "@/lib/circles";

/**
 * One care circle: who is cared for, the user's role and what is left to do
 * today. Opens the circle page.
 */
export function CircleCard({ circle }: { circle: MyCircle }) {
  const t = useTranslations("Circles");
  const home = useTranslations("MyCircles");
  const plan = useTranslations("Plan");
  const recipient = circle.recipient;
  const tasks = circle.tasks;
  // Doses still not confirmed an hour after their time.
  const missedDoses = circle.missedDoses ?? 0;

  return (
    <Link
      href={`/krag/${circle.id}`}
      className="group flex items-center gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex flex-1 flex-col items-start gap-2">
        <Badge tone={circle.role === "CAREGIVER" ? "info" : "brand"}>
          {t(`roles.${circle.role}`)}
        </Badge>
        <span className="text-xl font-extrabold">{circle.name}</span>
        {recipient ? (
          <span className="text-lg">
            {recipient.age === null
              ? recipient.firstName
              : t("recipientWithAge", {
                  name: recipient.firstName,
                  age: recipient.age,
                })}
            {recipient.city ? (
              <span className="text-muted">, {recipient.city}</span>
            ) : null}
          </span>
        ) : null}
        {tasks || missedDoses ? (
          <span className="flex flex-wrap gap-x-3 gap-y-1 font-bold">
            {tasks ? (
              <span className="text-brand">
                {home("todayCount", { count: tasks.today })}
              </span>
            ) : null}
            {tasks && tasks.overdue > 0 ? (
              <span className="text-danger">
                {plan("overdueCount", { count: tasks.overdue })}
              </span>
            ) : null}
            {missedDoses ? (
              <span className="text-warn">
                {home("missedDoses", { count: missedDoses })}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
