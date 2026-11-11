"use server";

import { revalidatePath } from "next/cache";
import { isTime, timeInPoland, todayInPoland } from "@/lib/dates";
import { confirmSeniorDoses } from "@/lib/medications";
import { getPairedDevice } from "@/lib/senior-device";

/** "Taken" on the senior screen: confirms the medicines of one time. */
export async function confirmSeniorDosesAction(formData: FormData) {
  const { device } = await getPairedDevice();
  const time = String(formData.get("time") ?? "");
  if (device && isTime(time)) {
    await confirmSeniorDoses({
      device,
      day: todayInPoland(),
      time,
      now: timeInPoland(),
    });
  }
  revalidatePath("/senior");
}
