import { headers } from "next/headers";

/** Address of the app for links and QR codes, e.g. http://localhost:3001. */
export async function appOrigin() {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  }
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
