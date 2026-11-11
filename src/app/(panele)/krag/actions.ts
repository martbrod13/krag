"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCircle, parseNewCircle } from "@/lib/circles";
import { db } from "@/lib/db";
import { cancelInvitation, createInvitation } from "@/lib/invitations";
import { isInvitableRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import type { InviteState } from "./[id]/zapros/invite-form";
import type { NewCircleState } from "./nowy/new-circle-form";

async function currentUserId() {
  const session = await getSession();
  if (!session) redirect("/logowanie");
  return session.user.id;
}

async function canManage(circleId: string, userId: string) {
  const membership = await db.membership.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { permissions: true },
  });
  return membership?.permissions.includes("MANAGE") ?? false;
}

/** Address of the app for invitation links, e.g. http://localhost:3001. */
async function appOrigin() {
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

export async function createCircleAction(
  _previous: NewCircleState,
  formData: FormData,
): Promise<NewCircleState> {
  const userId = await currentUserId();
  const parsed = parseNewCircle(Object.fromEntries(formData), new Date());
  if ("error" in parsed) return { error: parsed.error };

  const circle = await createCircle(userId, parsed.input);
  redirect(`/krag/${circle.id}`);
}

export async function createInvitationAction(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const role = formData.get("role");

  if (!isInvitableRole(role)) return { error: "roleRequired" };
  if (!(await canManage(circleId, userId))) return { error: "notAllowed" };

  const { token } = await createInvitation({
    circleId,
    invitedById: userId,
    role,
  });
  revalidatePath(`/krag/${circleId}`);
  return { link: `${await appOrigin()}/zaproszenie/${token}` };
}

export async function cancelInvitationAction(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const invitationId = String(formData.get("invitationId") ?? "");

  if (await canManage(circleId, userId)) {
    await cancelInvitation({ circleId, invitationId, userId });
  }
  revalidatePath(`/krag/${circleId}`);
}
