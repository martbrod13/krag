import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { getSession, safeNextPath } from "@/lib/session";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Login");
  return { title: t("title") };
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/logowanie">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  if (await getSession()) redirect(nextPath);

  const t = await getTranslations("Login");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Logo className="size-12" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
      </div>
      <LoginForm
        next={nextPath}
        showDevHint={process.env.NODE_ENV !== "production"}
      />
    </main>
  );
}
