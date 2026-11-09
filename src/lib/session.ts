import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/** The current session, or null when nobody is signed in. Read once per request. */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** Where to go after signing in. Only paths inside Krąg, never other sites. */
export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Returns the signed-in user, or sends the visitor to sign in first. */
export async function requireUser(currentPath: string) {
  const session = await getSession();
  const next = encodeURIComponent(currentPath);
  if (!session) redirect(`/logowanie?next=${next}`);
  if (!session.user.name.trim()) redirect(`/witaj?next=${next}`);
  return session.user;
}
