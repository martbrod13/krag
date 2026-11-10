"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getSession, safeNextPath } from "@/lib/session";
import type { WelcomeState } from "./welcome-form";

const MAX_NAME_LENGTH = 60;

export async function saveName(
  _previous: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const session = await getSession();
  if (!session) redirect("/logowanie");

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  if (!name) return { error: "nameRequired" };

  await db.user.update({
    where: { id: session.user.id },
    data: { name, locale: await getLocale() },
  });

  redirect(safeNextPath(formData.get("next")));
}
