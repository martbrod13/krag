"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  confirmsCircleName,
  deleteCircle,
  getCircleForMember,
  hasPermission,
} from "@/lib/circles";
import { removeMember, updateMember } from "@/lib/members";
import { isRole } from "@/lib/permissions";
import { currentUserId } from "@/lib/session";
import type { DeleteCircleState } from "./delete-circle-form";
import type { MemberFormResult } from "./member-form";

// The circle page and the settings both show the circle's people.
function refresh(circleId: string) {
  revalidatePath(`/krag/${circleId}`);
  revalidatePath(`/krag/${circleId}/ustawienia`);
}

type MemberInput = {
  circleId: unknown;
  memberId: unknown;
  role: unknown;
  permissions: unknown;
};

export async function updateMemberAction(
  input: MemberInput,
): Promise<MemberFormResult> {
  const userId = await currentUserId();
  const circleId = String(input.circleId ?? "");
  const memberId = String(input.memberId ?? "");
  if (!(await hasPermission(circleId, userId, "MANAGE"))) {
    return { status: "error", error: "notAllowed" };
  }
  if (!isRole(input.role)) return { status: "error", error: "notFound" };

  const result = await updateMember({
    circleId,
    memberId,
    role: input.role,
    permissions: Array.isArray(input.permissions) ? input.permissions : [],
    userId,
  });
  if (result !== "ok") return { status: "error", error: result };

  refresh(circleId);
  // A coordinator who stepped down no longer sees the settings.
  if (memberId === userId && input.role !== "COORDINATOR") {
    redirect(`/krag/${circleId}`);
  }
  return { status: "saved" };
}

export async function removeMemberAction(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  // Leaving the circle yourself is a separate button on the circle page.
  if (
    memberId !== userId &&
    (await hasPermission(circleId, userId, "MANAGE"))
  ) {
    await removeMember({ circleId, memberId, userId });
  }
  refresh(circleId);
}

/** Deletes the whole circle once the coordinator has typed its name. */
export async function deleteCircleAction(
  _previous: DeleteCircleState,
  formData: FormData,
): Promise<DeleteCircleState> {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const circle = await getCircleForMember(circleId, userId);
  if (!circle?.permissions.includes("MANAGE")) return { error: "notAllowed" };

  const typed = String(formData.get("confirmName") ?? "");
  if (!confirmsCircleName(typed, circle.name)) return { error: "nameMismatch" };

  await deleteCircle(circleId);
  redirect("/?usunieto=1");
}
