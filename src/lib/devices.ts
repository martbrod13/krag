import { logAccess } from "@/lib/audit";
import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";
import { hashToken, newToken } from "@/lib/tokens";

// The senior's phone or tablet has no account. A coordinator shows a one-time
// QR code, the device opens it and gets its own secret token, kept in a cookie
// (docs/mapa-danych.md, sections 2 and 9). Only hashes of the code and of the
// token are stored.

/** A pairing QR code works once, for 30 minutes (data map, decision 6). */
export const PAIRING_MINUTES = 30;

/** Opening the senior screen goes into the access log at most once an hour. */
const VISIT_INTERVAL_MS = 60 * 60 * 1000;

const DEVICE_NAME_MAX_LENGTH = 40;

/** The name the family gives the device, e.g. "Telefon mamy". */
export function parseDeviceName(value: unknown, fallback: string) {
  const name = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, DEVICE_NAME_MAX_LENGTH);
  return name || fallback;
}

/**
 * Creates a one-time pairing code and returns its token for the QR code.
 * The caller must check that the user may manage the circle.
 */
export async function createPairing(params: {
  circleId: string;
  createdById: string;
  deviceName: string;
}) {
  const token = newToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAIRING_MINUTES * 60 * 1000);

  const pairing = await db.$transaction(async (tx) => {
    // Expired codes of the circle are no longer needed.
    await tx.devicePairing.deleteMany({
      where: { circleId: params.circleId, expiresAt: { lt: now } },
    });
    const created = await tx.devicePairing.create({
      data: {
        circleId: params.circleId,
        deviceName: params.deviceName,
        tokenHash: hashToken(token),
        expiresAt,
        createdById: params.createdById,
      },
      select: { id: true, expiresAt: true },
    });
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.createdById,
        action: "CREATE",
        entity: "DevicePairing",
        entityId: created.id,
      },
      tx,
    );
    return created;
  });

  return { token, ...pairing };
}

/** What the device shows before pairing, or null if the code no longer works. */
export async function findPairing(token: string) {
  const pairing = await db.devicePairing.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      deviceName: true,
      expiresAt: true,
      usedAt: true,
      circle: { select: { name: true } },
    },
  });
  if (!pairing) return null;
  if (pairing.expiresAt <= new Date()) {
    // An expired code is not needed any more (data map, section 2).
    await db.devicePairing.deleteMany({ where: { id: pairing.id } });
    return null;
  }
  if (pairing.usedAt) return null;
  return { deviceName: pairing.deviceName, circleName: pairing.circle.name };
}

export type PairingStatus = "waiting" | "paired" | "expired";

/** Lets the family's screen show the moment the device has used the code. */
export async function getPairingStatus(
  circleId: string,
  pairingId: string,
): Promise<PairingStatus> {
  const pairing = await db.devicePairing.findFirst({
    where: { id: pairingId, circleId },
    select: { usedAt: true, expiresAt: true },
  });
  if (!pairing) return "expired";
  if (pairing.usedAt) return "paired";
  return pairing.expiresAt <= new Date() ? "expired" : "waiting";
}

export type PairResult =
  | { status: "paired"; token: string; circleId: string }
  | { status: "invalid" };

/**
 * Pairs the device that opened the QR code: uses up the code and creates the
 * device with a new secret token for its cookie. If the device was paired
 * before (previousToken), that old pairing is removed, so it does not stay
 * on the family's list.
 */
export async function pairDevice(
  pairingToken: string,
  previousToken?: string,
): Promise<PairResult> {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const pairing = await tx.devicePairing.findUnique({
      where: { tokenHash: hashToken(pairingToken) },
    });
    if (!pairing || pairing.usedAt || pairing.expiresAt <= now) {
      return { status: "invalid" };
    }

    // Only one of two parallel uses of the same code gets past this point.
    const used = await tx.devicePairing.updateMany({
      where: { id: pairing.id, usedAt: null },
      data: { usedAt: now },
    });
    if (used.count === 0) return { status: "invalid" };

    if (previousToken) {
      await removeDevice(tx, { tokenHash: hashToken(previousToken) });
    }

    const token = newToken();
    const device = await tx.pairedDevice.create({
      data: {
        circleId: pairing.circleId,
        name: pairing.deviceName,
        tokenHash: hashToken(token),
        pairedById: pairing.createdById,
      },
      select: { id: true },
    });
    await logAccess(
      {
        circleId: pairing.circleId,
        userId: pairing.createdById,
        deviceId: device.id,
        action: "CREATE",
        entity: "PairedDevice",
        entityId: device.id,
      },
      tx,
    );
    return { status: "paired", token, circleId: pairing.circleId };
  });
}

type DeviceWhere = { tokenHash: string } | { id: string; circleId: string };

async function removeDevice(
  client: DbClient,
  where: DeviceWhere,
  userId?: string,
) {
  const device = await client.pairedDevice.findFirst({
    where,
    select: { id: true, circleId: true },
  });
  if (!device) return false;

  const deleted = await client.pairedDevice.deleteMany({
    where: { id: device.id },
  });
  if (deleted.count === 0) return false;
  await logAccess(
    {
      circleId: device.circleId,
      userId,
      action: "DELETE",
      entity: "PairedDevice",
      entityId: device.id,
    },
    client,
  );
  return true;
}

/**
 * Unpairs a device of the circle: its cookie stops working at once.
 * Returns false if there was no such device.
 */
export async function unpairDevice(params: {
  circleId: string;
  deviceId: string;
  userId: string;
}) {
  return db.$transaction((tx) =>
    removeDevice(
      tx,
      { id: params.deviceId, circleId: params.circleId },
      params.userId,
    ),
  );
}

export type PairedDeviceInfo = { id: string; circleId: string; name: string };

/** The device that holds this token, or null when it is not (or no longer) paired. */
export async function findDeviceByToken(
  token: string,
): Promise<PairedDeviceInfo | null> {
  return db.pairedDevice.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, circleId: true, name: true },
  });
}

/**
 * Notes that the senior screen was opened: the device's last use and an
 * entry in the access log, at most once an hour.
 */
export async function recordDeviceVisit(device: PairedDeviceInfo) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - VISIT_INTERVAL_MS);
  const counted = await db.pairedDevice.updateMany({
    where: {
      id: device.id,
      OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: hourAgo } }],
    },
    data: { lastUsedAt: now },
  });
  if (counted.count > 0) {
    await logAccess({
      circleId: device.circleId,
      deviceId: device.id,
      action: "VIEW",
      entity: "CareRecipient",
    });
  }
}
