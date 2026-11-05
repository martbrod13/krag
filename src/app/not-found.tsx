import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("NotFound");
  const common = useTranslations("Common");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-5 px-5 py-10">
      <Logo className="size-12" />
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="text-lg text-muted">{t("lead")}</p>
      <ButtonLink href="/">{common("backToStart")}</ButtonLink>
    </main>
  );
}
