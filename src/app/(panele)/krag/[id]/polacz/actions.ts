"use server";

import { getFormatter, getTranslations } from "next-intl/server";
import { appOrigin } from "@/lib/app-origin";
import { hasPermission } from "@/lib/circles";
import {
  createPairing,
  getPairingStatus,
  type PairingStatus,
  parseDeviceName,
} from "@/lib/devices";
import { qrCodePath } from "@/lib/qr";
import { currentUserId } from "@/lib/session";
import type { PairState } from "./pair-device";

export async function createPairingAction(
  _previous: PairState,
  formData: FormData,
): Promise<PairState> {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  if (!(await hasPermission(circleId, userId, "MANAGE"))) {
    return { error: "notAllowed" };
  }

  const t = await getTranslations("PairDevice");
  const deviceName = parseDeviceName(formData.get("name"), t("defaultName"));
  const pairing = await createPairing({
    circleId,
    createdById: userId,
    deviceName,
  });

  const link = `${await appOrigin()}/senior/polacz/${pairing.token}`;
  const format = await getFormatter();
  return {
    pairing: {
      id: pairing.id,
      link,
      deviceName,
      qr: qrCodePath(link),
      validUntil: format.dateTime(pairing.expiresAt, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  };
}

/** Asked every few seconds by the QR code screen: has the device paired yet? */
export async function pairingStatusAction(
  circleId: string,
  pairingId: string,
): Promise<PairingStatus> {
  const userId = await currentUserId();
  if (!(await hasPermission(circleId, userId, "MANAGE"))) return "expired";
  return getPairingStatus(circleId, pairingId);
}
