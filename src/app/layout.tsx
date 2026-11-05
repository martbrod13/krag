import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

// The font is downloaded at build time and served from our own server,
// so users' browsers never send requests to Google.
// latin-ext has Polish letters (ą, ę, ł), cyrillic has Ukrainian (і, ї, є, ґ).
const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: { default: "Krąg", template: "%s · Krąg" },
    description: t("description"),
    applicationName: "Krąg",
    appleWebApp: { title: "Krąg", capable: true, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1f6b57",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${nunitoSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas font-sans text-ink">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
