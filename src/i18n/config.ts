export const locales = ["pl", "uk"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pl";

/** Cookie that remembers the language chosen in the app. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/**
 * Picks the best supported language from the browser's Accept-Language
 * header, e.g. "uk-UA,uk;q=0.9,pl;q=0.8" gives "uk". This way a caregiver
 * whose phone is set to Ukrainian sees Ukrainian on the first visit.
 */
export function matchLocale(acceptLanguage: string | null): Locale | undefined {
  if (!acceptLanguage) return undefined;

  const preferences = acceptLanguage.split(",").map((entry) => {
    const [tag, ...params] = entry.trim().split(";");
    const quality = params.find((param) => param.trim().startsWith("q="));
    return {
      language: tag.split("-")[0].toLowerCase(),
      weight: quality ? Number(quality.trim().slice(2)) : 1,
    };
  });

  preferences.sort((a, b) => b.weight - a.weight);

  for (const { language, weight } of preferences) {
    if (weight > 0 && isLocale(language)) return language;
  }
  return undefined;
}
