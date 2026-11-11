import type { AuditAction } from "@/generated/prisma/client";
import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";

type AuditEntry = {
  circleId: string;
  /** The person who opened or changed the data. */
  userId?: string | null;
  /** The care recipient's paired phone or tablet (senior screen). */
  deviceId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
};

/**
 * Adds an entry to the circle's access log: who opened or changed what, and
 * when (docs/mapa-danych.md, section 8). Pass a transaction client to log
 * as part of a larger change.
 */
export async function logAccess(entry: AuditEntry, client: DbClient = db) {
  await client.auditLog.create({ data: entry });
}
