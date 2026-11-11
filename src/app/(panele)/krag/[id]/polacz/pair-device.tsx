"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/icons";
import { QrImage } from "@/components/qr-image";
import { ShareLink } from "@/components/share-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PairingStatus } from "@/lib/devices";
import type { QrCode } from "@/lib/qr";
import { createPairingAction, pairingStatusAction } from "./actions";

export type PairState = {
  pairing?: {
    id: string;
    link: string;
    deviceName: string;
    qr: QrCode;
    /** Time when the code stops working, e.g. "11:52". */
    validUntil: string;
  };
  error?: "notAllowed";
};

const CHECK_EVERY_MS = 3000;

/** Checks every few seconds whether the senior's device has used the code. */
function usePairingStatus(circleId: string, pairingId: string | undefined) {
  const [status, setStatus] = useState<PairingStatus>("waiting");

  useEffect(() => {
    if (!pairingId) return;
    let active = true;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const next = await pairingStatusAction(circleId, pairingId);
      if (!active || next === "waiting") return;
      window.clearInterval(timer);
      setStatus(next);
    }, CHECK_EVERY_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [circleId, pairingId]);

  return status;
}

type PairDeviceProps = { circleId: string; circleName: string };

export function PairDevice({ circleId, circleName }: PairDeviceProps) {
  const t = useTranslations("PairDevice");
  const [state, formAction, pending] = useActionState(createPairingAction, {});
  const pairing = state.pairing;
  const status = usePairingStatus(circleId, pairing?.id);

  if (!pairing) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="circleId" value={circleId} />
        <label className="flex flex-col gap-2">
          <span className="font-bold">{t("nameLabel")}</span>
          <Input
            name="name"
            maxLength={40}
            autoComplete="off"
            placeholder={t("namePlaceholder")}
          />
        </label>
        <Button type="submit" size="lg" disabled={pending}>
          {t("showCode")}
        </Button>
        {state.error ? (
          <p
            role="alert"
            className="rounded-2xl bg-danger-soft p-4 text-danger"
          >
            {t(`errors.${state.error}`)}
          </p>
        ) : null}
      </form>
    );
  }

  if (status === "paired") {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="flex items-center gap-4 rounded-card bg-brand-soft p-5 text-brand-strong"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <CheckIcon className="size-7" />
          </span>
          <p className="text-lg font-bold">
            {t("paired", { name: pairing.deviceName })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/krag/${circleId}`} size="lg">
            {t("done")}
          </ButtonLink>
          {/* Reloading the page starts from scratch with a new code. */}
          <Button
            size="lg"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            {t("another")}
          </Button>
        </div>
      </div>
    );
  }

  const expired = status === "expired";

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col items-center gap-4">
        <QrImage
          qr={pairing.qr}
          label={t("qrLabel")}
          className={expired ? "opacity-15" : undefined}
        />
        <p role="status" className="text-lg font-bold">
          {expired ? t("expired") : t("waiting")}
        </p>
      </Card>

      {expired ? (
        <Button size="lg" onClick={() => window.location.reload()}>
          {t("newCode")}
        </Button>
      ) : (
        <>
          <ol className="flex list-decimal flex-col gap-2 pl-6 text-lg">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
          </ol>
          <p className="text-muted">
            {t("validUntil", { time: pairing.validUntil })}
          </p>

          <section
            aria-labelledby="remote"
            className="flex flex-col gap-3 border-t border-line pt-5"
          >
            <h2 id="remote" className="text-xl font-extrabold">
              {t("remoteTitle")}
            </h2>
            <p>{t("remoteLead")}</p>
            <Input
              readOnly
              value={pairing.link}
              aria-label={t("linkLabel")}
              onFocus={(event) => event.target.select()}
            />
            <ShareLink
              link={pairing.link}
              title={t("shareTitle")}
              text={t("shareText", { circle: circleName })}
              labels={{
                share: t("share"),
                copy: t("copy"),
                copied: t("copied"),
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
