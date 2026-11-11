import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { dayForDisplay } from "@/lib/dates";
import type { MedicationView } from "@/lib/medications";

type MedicationCardProps = {
  medication: MedicationView;
  circleId: string;
  /** Short names of the days of the week, Monday first. */
  weekdayNames: string[];
  today: string;
};

/**
 * A medicine on the list: on which days, at what times and how much, how to
 * take it and until when. Opens the medicine to change it.
 */
export function MedicationCard({
  medication,
  circleId,
  weekdayNames,
  today,
}: MedicationCardProps) {
  const t = useTranslations("Medications");
  const format = useFormatter();
  const date = (day: string) =>
    format.dateTime(
      dayForDisplay(day),
      day.slice(0, 4) === today.slice(0, 4)
        ? { day: "numeric", month: "long" }
        : { day: "numeric", month: "long", year: "numeric" },
    );

  const asNeeded = medication.times.length === 0;
  const days = () => {
    if (asNeeded) return t("asNeeded");
    if (medication.weekdays.length === 0) return t("everyDay");
    const names = medication.weekdays.map((day) => weekdayNames[day - 1]);
    return t("onDays", { days: names.join(", ") });
  };

  return (
    <li>
      <Link
        href={`/krag/${circleId}/leki/${medication.id}`}
        className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-4 transition-colors hover:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className="text-lg font-extrabold break-words">
          {medication.name}
        </span>
        <span className="text-muted">{days()}</span>
        {asNeeded ? null : (
          <span className="flex flex-wrap gap-2">
            {medication.times.map((entry) => (
              <span
                key={entry.time}
                className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-brand-strong"
              >
                <span className="font-bold tabular-nums">{entry.time}</span>
                {entry.amount ? <span>{entry.amount}</span> : null}
              </span>
            ))}
          </span>
        )}
        {medication.note ? (
          <span className="break-words">{medication.note}</span>
        ) : null}
        {medication.startDate > today || medication.endDate ? (
          <span className="flex flex-wrap gap-x-3 text-muted">
            {medication.startDate > today ? (
              <span>{t("startsOn", { date: date(medication.startDate) })}</span>
            ) : null}
            {medication.endDate ? (
              <span>{t("endsOn", { date: date(medication.endDate) })}</span>
            ) : null}
          </span>
        ) : null}
        {!asNeeded && medication.showToSenior ? (
          <Badge tone="info">{t("seniorReminder")}</Badge>
        ) : null}
      </Link>
    </li>
  );
}
