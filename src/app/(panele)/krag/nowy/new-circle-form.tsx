"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CircleFormError } from "@/lib/circles";
import { createCircleAction } from "../actions";

export type NewCircleState = {
  error?: CircleFormError;
  /** What was typed, shown again after an error. */
  values?: Record<string, string>;
};

export function NewCircleForm() {
  const t = useTranslations("NewCircle");
  const [state, formAction, pending] = useActionState(createCircleAction, {});
  const values = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("name")}</span>
        <Input
          name="name"
          required
          maxLength={80}
          placeholder={t("nameHint")}
          defaultValue={values?.name}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("firstName")}</span>
        <Input
          name="firstName"
          required
          maxLength={60}
          defaultValue={values?.firstName}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("birthDate")}</span>
        <Input
          name="birthDate"
          type="date"
          min="1900-01-01"
          defaultValue={values?.birthDate}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("city")}</span>
        <Input
          name="city"
          maxLength={80}
          autoComplete="address-level2"
          defaultValue={values?.city}
        />
      </label>
      <Button type="submit" size="lg" disabled={pending}>
        {t("create")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
