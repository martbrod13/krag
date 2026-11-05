"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: unknown;
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  const t = useTranslations("Error");

  useEffect(() => {
    // Error reporting comes in a later stage, without any personal data.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-5 px-5 py-10">
      <Logo className="size-12" />
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="text-lg text-muted">{t("lead")}</p>
      <Button onClick={() => retry()}>{t("retry")}</Button>
    </main>
  );
}
