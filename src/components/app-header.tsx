import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * The top bar of the signed-in app: the logo takes you to "My circles",
 * on the right is signing out (or, for visitors, back to the start).
 */
export function AppHeader({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Common");

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2 rounded-full pr-3 text-lg font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Logo className="size-8" />
        {t("appName")}
      </Link>
      {signedIn ? (
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
  );
}
