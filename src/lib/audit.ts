import type { AuditAction } from "@/generated/prisma/client";
import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";

type AuditEntry = {
  circleId: string;
  userId: string;
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
