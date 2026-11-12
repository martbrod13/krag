import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { dayForDisplay } from "@/lib/dates";
import { type VisitView, isInProgress, isMissedVisit } from "@/lib/visits";

type VisitItemProps = {
  visit: VisitView;
  circleId: string;
  today: string;
  /** Lists across days name the day. */
  showDay?: boolean;
};

/** "09:00–12:00" or "09:00". */
export function timeRange(start: string, end: string | null) {
  return end ? `${start}–${end}` : start;
}

/**
 * One visit on a list: when, who comes and how it went, with what was done
 * and the beginning of the report. Opens the visit.
 */
export function VisitItem({
  visit,
  circleId,
  today,
  showDay = false,
}: VisitItemProps) {
  const t = useTranslations("Visits");
  const report = useTranslations("VisitReport");
  const format = useFormatter();

  let status: ReactNode = null;
  if (isInProgress(visit)) {
    status = (
      <span className="font-bold text-brand">
        {t("inProgress", { time: visit.actualStart ?? "" })}
      </span>
    );
  } else if (visit.actualStart && visit.actualEnd) {
    status = (
      <span className="text-muted">
        {t("happened", { time: timeRange(visit.actualStart, visit.actualEnd) })}
      </span>
    );
  } else if (isMissedVisit(visit, today)) {
    status = <span className="font-bold text-warn">{t("missed")}</span>;
  } else if (visit.plan) {
    status = <span className="line-clamp-2 text-muted">{visit.plan}</span>;
  }

  return (
    <li>
      <Link
        href={`/krag/${circleId}/wizyty/${visit.id}`}
        className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {showDay ? (
          <span className="text-sm font-bold text-muted">
            {format.dateTime(dayForDisplay(visit.date), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        ) : null}
        <span className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold">
          <span className="tabular-nums">
            {timeRange(visit.startTime, visit.endTime)}
          </span>
          <span className={visit.visitor ? undefined : "text-warn"}>
            {visit.visitor?.name ?? t("noVisitor")}
          </span>
        </span>
        {status}
        {visit.activities.length > 0 ? (
          <span className="flex flex-wrap gap-2 pt-1">
            {visit.activities.map((activity) => (
              <span
                key={activity}
                className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand-strong"
              >
                {report(`activities.${activity}`)}
              </span>
            ))}
          </span>
        ) : null}
        {visit.report ? (
          <span className="line-clamp-3 whitespace-pre-line">
            {visit.report}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
