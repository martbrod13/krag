import { cookies } from "next/headers";
import { cache } from "react";
import { DEVICE_COOKIE } from "@/lib/device-cookie";
import { findDeviceByToken } from "@/lib/devices";

/**
 * The paired senior device that sent this request, read once per request.
 * `unpaired` is true when the device still has a cookie, but the family has
 * removed it from the circle.
 */
export const getPairedDevice = cache(async () => {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token) return { device: null, unpaired: false };
  const device = await findDeviceByToken(token);
  return { device, unpaired: device === null };
});
