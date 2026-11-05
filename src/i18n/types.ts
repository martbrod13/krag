import type { Locale } from "./config";
import messages from "../../messages/pl.json";

// Makes TypeScript check translation keys: t("title") must exist in
// messages/pl.json, otherwise the code does not compile.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
