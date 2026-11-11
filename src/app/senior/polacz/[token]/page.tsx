import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { findPairing } from "@/lib/devices";
import { getPairedDevice } from "@/lib/senior-device";
import { pairDeviceAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SeniorPair");
  return { title: t("metaTitle") };
}

// Opened on the senior's phone or tablet from the QR code. Opening the link
// changes nothing: link previews in chat apps open links too. The device is
// paired only after a tap on "Pair".
export default async function PairPage({
  params,
}: PageProps<"/senior/polacz/[token]">) {
  const { token } = await params;
  const t = await getTranslations("SeniorPair");
  const pairing = await findPairing(token);

  if (!pairing) {
    // Most often: "Pair" was tapped twice, or the code was scanned again.
    const { device } = await getPairedDevice();
    return (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <Logo className="size-14" />
        <h1 className="text-4xl font-extrabold">
          {device ? t("alreadyTitle") : t("invalidTitle")}
        </h1>
        <p className="text-2xl">
          {device ? t("alreadyLead") : t("invalidLead")}
        </p>
        <ButtonLink href="/senior" size="lg">
          {t("openScreen")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <Logo className="size-14" />
      <h1 className="text-4xl font-extrabold">
        {t("title", { circle: pairing.circleName })}
      </h1>
      <p className="text-2xl">{t("lead")}</p>
      <form action={pairDeviceAction}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton size="xl" className="w-full">
          {t("pair")}
        </SubmitButton>
      </form>
      <p className="text-lg text-muted">
        {t("note", { device: pairing.deviceName })}
      </p>
    </div>
  );
}
