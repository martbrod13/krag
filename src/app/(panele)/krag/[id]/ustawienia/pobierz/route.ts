import { getFormatter, getTranslations } from "next-intl/server";
import { hasPermission } from "@/lib/circles";
import { exportCircle, fileSlug } from "@/lib/export";
import { jsonDownload } from "@/lib/export-response";
import { requireUser } from "@/lib/session";

// Everything in the circle as a JSON file, for coordinators only (data
// map, users' rights). The download goes into the access log.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/ustawienia`);
  if (!(await hasPermission(id, user.id, "MANAGE"))) {
    return new Response(null, { status: 404 });
  }
  const data = await exportCircle(id, user.id);
  if (!data) return new Response(null, { status: 404 });

  const t = await getTranslations("Export");
  const log = await getTranslations("AccessLog");
  const format = await getFormatter();
  const file = {
    about: t("circleAbout", {
      name: data.circle.name,
      date: format.dateTime(data.exportedAt, { dateStyle: "long" }),
    }),
    ...data,
    // Each entry of the access log also as a sentence, as in the app.
    accessLog: data.accessLog.map((entry) => ({
      ...entry,
      text: log(`events.${entry.event}`, { name: entry.about ?? "—" }),
    })),
  };
  return jsonDownload(file, fileSlug(data.circle.name) || t("circleFileName"));
}
