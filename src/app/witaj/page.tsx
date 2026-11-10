import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { getSession, safeNextPath } from "@/lib/session";
import { WelcomeForm } from "./welcome-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Welcome");
  return { title: t("title") };
}

// First visit after signing up: we only ask for a first name.
export default async function WelcomePage({
  searchParams,
}: PageProps<"/witaj">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  const session = await getSession();
  if (!session) redirect(`/logowanie?next=${encodeURIComponent(nextPath)}`);
  if (session.user.name.trim()) redirect(nextPath);

  const t = await getTranslations("Welcome");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Logo className="size-12" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
      </div>
      <WelcomeForm next={nextPath} />
    </main>
  );
}
