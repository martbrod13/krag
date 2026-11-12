import { getFormatter, getTranslations } from "next-intl/server";
import { exportAccount } from "@/lib/export";
import { jsonDownload } from "@/lib/export-response";
import { requireUser } from "@/lib/session";

// The signed-in person's own data as a JSON file (data map, users' rights;
// GDPR art. 15 and 20).
export async function GET() {
  const user = await requireUser("/konto");
  const data = await exportAccount(user.id);
  if (!data) return new Response(null, { status: 404 });

  const t = await getTranslations("Export");
  const format = await getFormatter();
  const file = {
    about: t("accountAbout", {
      date: format.dateTime(data.exportedAt, { dateStyle: "long" }),
    }),
    ...data,
  };
  return jsonDownload(file, t("accountFileName"));
}
