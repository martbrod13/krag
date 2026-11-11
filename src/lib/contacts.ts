import type { Prisma } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import { db } from "@/lib/db";

/** The senior screen has room for this many big "call" buttons. */
export const MAX_CONTACTS = 6;

/** An emergency contact: who to call, shown on the senior screen. */
export type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
};

export type ContactInput = Omit<Contact, "id">;

export type ContactError = "nameRequired" | "phoneInvalid";

type ContactOrder = Prisma.EmergencyContactOrderByWithRelationInput;

/** The same order everywhere: on the family's list and the senior screen. */
export const contactOrder: ContactOrder[] = [
  { position: "asc" },
  { id: "asc" },
];

export const contactFields = {
  id: true,
  name: true,
  phone: true,
  relationship: true,
} satisfies Prisma.EmergencyContactSelect;

/**
 * A phone number as people write it: digits, optionally a + at the start,
 * spaces, dashes, dots or brackets between them, 7 to 15 digits in total.
 */
export function isPhoneNumber(value: string) {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

/** Checks the "add a number" form. Text is trimmed and shortened to safe lengths. */
export function parseContact(
  fields: Record<string, unknown>,
): { input: ContactInput } | { error: ContactError } {
  const text = (key: string, max: number) =>
    String(fields[key] ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, max);

  const name = text("name", 60);
  const phone = text("phone", 30);
  const relationship = text("relationship", 40);

  if (!name) return { error: "nameRequired" };
  if (!isPhoneNumber(phone)) return { error: "phoneInvalid" };
  return { input: { name, phone, relationship: relationship || null } };
}

/** A link that starts a call: "+48 100 000 001" gives "tel:+48100000001". */
export function telHref(phone: string) {
  const plus = phone.trim().startsWith("+") ? "+" : "";
  return `tel:${plus}${phone.replace(/\D/g, "")}`;
}

/** The circle's emergency contacts, in order. */
export async function listContacts(circleId: string): Promise<Contact[]> {
  return db.emergencyContact.findMany({
    where: { recipient: { circleId } },
    orderBy: contactOrder,
    select: contactFields,
  });
}

export type AddContactResult = "added" | "tooMany" | "noRecipient";

/**
 * Adds a number at the end of the list. The caller must check that the user
 * may manage the circle.
 */
export async function addContact(params: {
  circleId: string;
  userId: string;
  input: ContactInput;
}): Promise<AddContactResult> {
  return db.$transaction(async (tx) => {
    const recipient = await tx.careRecipient.findUnique({
      where: { circleId: params.circleId },
      select: { id: true, emergencyContacts: { select: { position: true } } },
    });
    if (!recipient) return "noRecipient";
    const existing = recipient.emergencyContacts;
    if (existing.length >= MAX_CONTACTS) return "tooMany";

    const last = Math.max(-1, ...existing.map((contact) => contact.position));
    const contact = await tx.emergencyContact.create({
      data: { ...params.input, recipientId: recipient.id, position: last + 1 },
      select: { id: true },
    });
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.userId,
        action: "CREATE",
        entity: "EmergencyContact",
        entityId: contact.id,
      },
      tx,
    );
    return "added";
  });
}

/** Deletes a number of the circle. Returns false if there was none. */
export async function deleteContact(params: {
  circleId: string;
  contactId: string;
  userId: string;
}) {
  return db.$transaction(async (tx) => {
    const deleted = await tx.emergencyContact.deleteMany({
      where: { id: params.contactId, recipient: { circleId: params.circleId } },
    });
    if (deleted.count === 0) return false;
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.userId,
        action: "DELETE",
        entity: "EmergencyContact",
        entityId: params.contactId,
      },
      tx,
    );
    return true;
  });
}
