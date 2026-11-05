import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, defaultLocale, isLocale, matchLocale } from "./config";

// Language order: the choice saved in the app, then the browser language,
// then Polish.
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const saved = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : (matchLocale((await headers()).get("accept-language")) ?? defaultLocale);

  return {
    locale,
    timeZone: "Europe/Warsaw",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
