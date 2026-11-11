import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { type AccessLogEntry, getAccessLog } from "@/lib/access-log";
import { getCircleForMember } from "@/lib/circles";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccessLog");
  return { title: t("title") };
}

const MAX_PAGE = 1000;

function pageNumber(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1;
}

// Who opened or changed what in the circle, and when. Only coordinators see
// it (docs/mapa-danych.md, section 8).
export default async function AccessLogPage({
  params,
  searchParams,
}: PageProps<"/krag/[id]/dziennik">) {
  const { id } = await params;
  const page = pageNumber((await searchParams).strona);
  const user = await requireUser(`/krag/${id}/dziennik`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("MANAGE")) redirect(`/krag/${id}`);

  const { entries, hasMore } = await getAccessLog(circle.id, page);
  const t = await getTranslations("AccessLog");
  const settings = await getTranslations("Settings");
  const format = await getFormatter();

  // Entries grouped by day, newest first.
  const days: { label: string; entries: AccessLogEntry[] }[] = [];
  for (const entry of entries) {
    const label = format.dateTime(entry.createdAt, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const last = days.at(-1);
    if (last?.label === label) last.entries.push(entry);
    else days.push({ label, entries: [entry] });
  }

  // A task or medicine deleted since keeps a placeholder instead of its name.
  const deletedSubject = (kind: AccessLogEntry["subjectKind"]) => {
    if (kind === "task") return t("deletedTask");
    if (kind === "medication") return t("deletedMedication");
    return "—";
  };

  const pageHref = (number: number) =>
    number > 1
      ? `/krag/${id}/dziennik?strona=${number}`
      : `/krag/${id}/dziennik`;

  return (
    <>
      <Link
        href={`/krag/${id}/ustawienia`}
        className="font-bold text-brand hover:underline"
      >
        ← {settings("title")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
      </div>

      {days.length === 0 ? (
        <p className="text-lg text-muted">{t("empty")}</p>
      ) : (
        days.map((day) => (
          <section key={day.label} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
              {day.label}
            </h2>
            <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
              {day.entries.map((entry) => (
                <li key={entry.id} className="flex gap-4 px-4 py-3">
                  <span className="w-14 shrink-0 font-bold text-muted tabular-nums">
                    {format.dateTime(entry.createdAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold">
                      {entry.actor ?? t("unknownActor")}
                    </span>
                    <span>
                      {t(`events.${entry.event}`, {
                        name:
                          entry.subject ?? deletedSubject(entry.subjectKind),
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {page > 1 || hasMore ? (
        <nav aria-label={t("pages")} className="flex flex-wrap gap-2">
          {page > 1 ? (
            <ButtonLink href={pageHref(page - 1)} variant="secondary">
              ← {t("newer")}
            </ButtonLink>
          ) : null}
          {hasMore ? (
            <ButtonLink href={pageHref(page + 1)} variant="secondary">
              {t("older")} →
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
