import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { AutoRefresh } from "@/components/senior/auto-refresh";
import { SeniorScreen } from "@/components/senior/senior-screen";
import { ButtonLink } from "@/components/ui/button";
import { listContacts } from "@/lib/contacts";
import { todayInPoland } from "@/lib/dates";
import { recordDeviceVisit } from "@/lib/devices";
import { getPairedDevice } from "@/lib/senior-device";
import { getSeniorPlan } from "@/lib/tasks";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Senior");
  return { title: t("title") };
}

/** Changes made by the family appear on the senior's screen within a minute. */
const REFRESH_SECONDS = 60;

// On the senior's paired phone or tablet: the senior screen.
// Anywhere else: how to pair a device.
export default async function SeniorPage() {
  const { device, unpaired } = await getPairedDevice();
  const t = await getTranslations("Senior");

  if (!device) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <Logo className="size-14" />
        <h1 className="text-4xl font-extrabold">{t("title")}</h1>
        <p className="text-2xl">
          {unpaired ? t("unpairedLead") : t("notPairedLead")}
        </p>
        <section aria-labelledby="how" className="flex flex-col gap-3">
          <h2 id="how" className="text-2xl font-extrabold">
            {t("howTitle")}
          </h2>
          <ol className="flex list-decimal flex-col gap-3 pl-7">
            <li>{t("howStep1")}</li>
            <li>{t("howStep2")}</li>
            <li>{t("howStep3")}</li>
          </ol>
        </section>
        <p className="text-muted">{t("noAccount")}</p>
        <ButtonLink href="/" size="lg" variant="secondary">
          {t("home")}
        </ButtonLink>
      </div>
    );
  }

  const [contacts, plan] = await Promise.all([
    listContacts(device.circleId),
    getSeniorPlan(device.circleId, todayInPoland()),
  ]);
  await recordDeviceVisit(device);

  return (
    <>
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <SeniorScreen contacts={contacts} plan={plan} />
    </>
  );
}
