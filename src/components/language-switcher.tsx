import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";
import { cx } from "@/lib/cx";

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const current = useLocale();

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-muted">{t("label")}</h2>
      <div className="flex flex-wrap gap-2">
        {locales.map((locale) => (
          <form key={locale} action={setLocale}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              lang={locale}
              aria-pressed={locale === current}
              className={cx(
                "min-h-11 rounded-full border px-4 font-bold transition-colors",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
                locale === current
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-line bg-surface text-ink hover:border-brand",
              )}
            >
              {t(locale)}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
