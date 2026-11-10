import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/session";

// Shared frame of the three panels: logo on the left (back to the start),
// sign-out on the right when someone is signed in.
export default async function PanelsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const t = await getTranslations("Common");
  const session = await getSession();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-full pr-3 text-lg font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Logo className="size-8" />
          {t("appName")}
        </Link>
        {session ? (
          <SignOutButton />
        ) : (
          <Link
            href="/"
            className="flex min-h-11 items-center rounded-full px-3 font-bold text-brand hover:bg-brand-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t("backToStart")}
          </Link>
        )}
      </header>
      <main className="flex flex-1 flex-col gap-5 px-5 py-6">{children}</main>
    </div>
  );
}
