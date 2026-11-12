import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

// The signed-in person's account: who they are and "Download my data".
export default async function AccountPage() {
  const user = await requireUser("/konto");
  const t = await getTranslations("Account");
  const circles = await getTranslations("Circles");

  return (
    <>
      <Link href="/" className="font-bold text-brand hover:underline">
        ← {circles("backToCircles")}
      </Link>
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>

      <Card className="flex flex-col gap-1">
        <p className="text-xl font-extrabold break-words">{user.name}</p>
        <p className="text-muted break-words">{user.email}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("exportTitle")}</h2>
        <p className="text-muted">{t("exportLead")}</p>
        {/* A plain link: a download, not a page to prefetch. */}
        <a
          href="/konto/pobierz"
          download
          className={buttonClasses({ variant: "secondary" })}
        >
          {t("exportButton")}
        </a>
        <p className="text-sm text-muted">{t("exportCircleHint")}</p>
      </Card>
    </>
  );
}
