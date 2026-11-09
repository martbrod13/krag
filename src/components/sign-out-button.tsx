import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button";
import { signOut } from "@/lib/sign-out";

export function SignOutButton() {
  const t = useTranslations("Common");

  return (
    <form action={signOut}>
      <button type="submit" className={buttonClasses({ variant: "secondary" })}>
        {t("signOut")}
      </button>
    </form>
  );
}
