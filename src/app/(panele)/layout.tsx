import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";

// Shared frame of the three panels: logo on the left, way back on the right.
export default function PanelsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const t = useTranslations("Common");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <Logo className="size-8" />
          {t("appName")}
        </div>
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-full px-3 font-bold text-brand hover:bg-brand-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t("backToStart")}
        </Link>
      </header>
      <main className="flex flex-1 flex-col gap-5 px-5 py-6">{children}</main>
    </div>
  );
}
