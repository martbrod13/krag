"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/app-origin";
import { createCircle, hasPermission, parseNewCircle } from "@/lib/circles";
import { unpairDevice } from "@/lib/devices";
import { formValues } from "@/lib/form";
import { cancelInvitation, createInvitation } from "@/lib/invitations";
import { removeMember } from "@/lib/members";
import { isInvitableRole } from "@/lib/permissions";
import { currentUserId } from "@/lib/session";
import type { InviteState } from "./[id]/zapros/invite-form";
import type { NewCircleState } from "./nowy/new-circle-form";

const NEW_CIRCLE_FIELDS = ["name", "firstName", "birthDate", "city"] as const;

export async function createCircleAction(
  _previous: NewCircleState,
  formData: FormData,
): Promise<NewCircleState> {
  const userId = await currentUserId();
  const parsed = parseNewCircle(Object.fromEntries(formData), new Date());
  if ("error" in parsed) {
    return {
      error: parsed.error,
      values: formValues(formData, NEW_CIRCLE_FIELDS),
    };
  }

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
  if (!(await hasPermission(circleId, userId, "MANAGE"))) {
    return { error: "notAllowed" };
  }

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

  if (await hasPermission(circleId, userId, "MANAGE")) {
    await cancelInvitation({ circleId, invitationId, userId });
  }
  revalidatePath(`/krag/${circleId}`);
}

/** Leaves the circle. The last coordinator stays (data map, decision 7). */
export async function leaveCircleAction(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const panel = formData.get("panel") === "/opiekun" ? "/opiekun" : "/rodzina";

  const result = await removeMember({ circleId, memberId: userId, userId });
  if (result === "ok") redirect(panel);
  revalidatePath(`/krag/${circleId}`);
}

export async function unpairDeviceAction(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const deviceId = String(formData.get("deviceId") ?? "");

  if (await hasPermission(circleId, userId, "MANAGE")) {
    await unpairDevice({ circleId, deviceId, userId });
  }
  revalidatePath(`/krag/${circleId}`);
}
