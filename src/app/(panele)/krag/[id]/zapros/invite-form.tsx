"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
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
  const [copied, setCopied] = useState(false);
  const link = state.link;

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Copying can be blocked; the link stays visible in the field.
    }
  }

  async function share(value: string) {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: t("shareTitle"),
          text: t("shareText", { circle: circleName }),
          url: value,
        });
      } catch {
        // The person closed the share sheet.
      }
      return;
    }
    await copy(value);
  }

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
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => void share(link)}>
            {t("share")}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => void copy(link)}>
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
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
