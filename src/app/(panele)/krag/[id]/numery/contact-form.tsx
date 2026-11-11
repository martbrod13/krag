"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContactError } from "@/lib/contacts";
import { addContactAction } from "./actions";

export type ContactFormState = {
  error?: ContactError | "tooMany" | "notAllowed";
  /** What was typed, shown again after an error. */
  values?: Record<string, string>;
  /** How many numbers were added on this page, for the "added" message. */
  added?: number;
};

export function ContactForm({ circleId }: { circleId: string }) {
  const t = useTranslations("Contacts");
  const [state, formAction, pending] = useActionState(addContactAction, {});
  const values = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="circleId" value={circleId} />
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("name")}</span>
        <Input
          name="name"
          required
          maxLength={60}
          autoComplete="off"
          placeholder={t("namePlaceholder")}
          defaultValue={values?.name}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("phone")}</span>
        <Input
          name="phone"
          type="tel"
          inputMode="tel"
          required
          maxLength={30}
          autoComplete="off"
          placeholder={t("phonePlaceholder")}
          defaultValue={values?.phone}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("relationship")}</span>
        <Input
          name="relationship"
          maxLength={40}
          autoComplete="off"
          placeholder={t("relationshipPlaceholder")}
          defaultValue={values?.relationship}
        />
      </label>
      <Button type="submit" size="lg" disabled={pending}>
        {t("add")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : state.added ? (
        <p
          role="status"
          className="rounded-2xl bg-brand-soft p-4 text-brand-strong"
        >
          {t("added")}
        </p>
      ) : null}
    </form>
  );
}
