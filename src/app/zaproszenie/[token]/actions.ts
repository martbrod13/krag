"use server";

import { redirect } from "next/navigation";
import { acceptInvitation } from "@/lib/invitations";
import { getSession } from "@/lib/session";

export async function joinCircleAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const path = `/zaproszenie/${token}`;

  const session = await getSession();
  if (!session) redirect(`/logowanie?next=${encodeURIComponent(path)}`);

  const result = await acceptInvitation(token, session.user.id);
  if (result.status === "invalid") redirect(path);
  redirect(`/krag/${result.circleId}`);
}
