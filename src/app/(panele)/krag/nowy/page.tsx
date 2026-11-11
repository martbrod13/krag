import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { NewCircleForm } from "./new-circle-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NewCircle");
  return { title: t("title") };
}

export default async function NewCirclePage() {
  await requireUser("/krag/nowy");
  const t = await getTranslations("NewCircle");

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
      </div>
      <NewCircleForm />
    </>
  );
}
