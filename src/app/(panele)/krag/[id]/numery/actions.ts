"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/circles";
import { addContact, deleteContact, parseContact } from "@/lib/contacts";
import { formValues } from "@/lib/form";
import { currentUserId } from "@/lib/session";
import type { ContactFormState } from "./contact-form";

const CONTACT_FIELDS = ["name", "phone", "relationship"] as const;

// The circle page and this page both list the numbers.
function refresh(circleId: string) {
  revalidatePath(`/krag/${circleId}`);
  revalidatePath(`/krag/${circleId}/numery`);
}

export async function addContactAction(
  previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  if (!(await hasPermission(circleId, userId, "MANAGE"))) {
    return { error: "notAllowed" };
  }

  const parsed = parseContact(Object.fromEntries(formData));
  if ("error" in parsed) {
    return {
      error: parsed.error,
      values: formValues(formData, CONTACT_FIELDS),
    };
  }

  const result = await addContact({ circleId, userId, input: parsed.input });
  if (result !== "added") {
    return {
      error: result === "tooMany" ? "tooMany" : "notAllowed",
      values: formValues(formData, CONTACT_FIELDS),
    };
  }

  refresh(circleId);
  return { added: (previous.added ?? 0) + 1 };
}

export async function deleteContactAction(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");

  if (await hasPermission(circleId, userId, "MANAGE")) {
    await deleteContact({ circleId, contactId, userId });
  }
  refresh(circleId);
}
