"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEVICE_COOKIE, deviceCookieOptions } from "@/lib/device-cookie";
import { pairDevice } from "@/lib/devices";

/** Pairs this phone or tablet: it gets its secret token in a cookie. */
export async function pairDeviceAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const cookieStore = await cookies();

  const result = await pairDevice(token, cookieStore.get(DEVICE_COOKIE)?.value);
  if (result.status === "invalid") {
    redirect(`/senior/polacz/${encodeURIComponent(token)}`);
  }

  cookieStore.set(DEVICE_COOKIE, result.token, deviceCookieOptions);
  redirect("/senior/gotowe");
}
