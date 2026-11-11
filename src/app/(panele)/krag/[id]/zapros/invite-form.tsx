"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ShareLink } from "@/components/share-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INVITABLE_ROLES } from "@/lib/permissions";
import { createInvitationAction } from "../../actions";

export type InviteState = {
  link?: string;
  error?: "roleRequired" | "notAllowed";
};

type InviteFormProps = { circleId: string; circleName: string };

export function InviteForm({ circleId, circleName }: InviteFormProps) {
  const t = useTranslations("Invite");
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    {},
  );
  const link = state.link;

  if (link) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-brand-soft p-4 text-lg text-brand-strong">
          {t("linkReady")}
        </p>
        <Input
          readOnly
          value={link}
          aria-label={t("linkLabel")}
          onFocus={(event) => event.target.select()}
        />
        <ShareLink
          link={link}
          title={t("shareTitle")}
          text={t("shareText", { circle: circleName })}
          labels={{ share: t("share"), copy: t("copy"), copied: t("copied") }}
        />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/krag/${circleId}`} variant="secondary">
            {t("done")}
          </ButtonLink>
          {/* Reloading the page starts the form from scratch. */}
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t("another")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-bold">{t("roleLabel")}</legend>
        {INVITABLE_ROLES.map((role) => (
          <label
            key={role}
            className="flex cursor-pointer gap-3 rounded-card border border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
          >
            <input
              type="radio"
              name="role"
              value={role}
              defaultChecked={role === "FAMILY"}
              className="mt-1 size-5 shrink-0 accent-brand"
            />
            <span className="flex flex-col gap-1">
              <span className="font-bold">{t(`roles.${role}.title`)}</span>
              <span className="text-muted">
                {t(`roles.${role}.description`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" size="lg" disabled={pending}>
        {t("createLink")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
