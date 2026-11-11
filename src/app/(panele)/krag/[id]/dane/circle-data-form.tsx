"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CircleFormError, CircleFormValues } from "@/lib/circles";
import { updateCircleAction } from "./actions";

export type CircleDataState = {
  error?: CircleFormError | "notAllowed";
  /** What was typed, shown again after an error. */
  values?: Record<string, string>;
};

type CircleDataFormProps = { circleId: string; saved: CircleFormValues };

export function CircleDataForm({ circleId, saved }: CircleDataFormProps) {
  const t = useTranslations("CircleData");
  const labels = useTranslations("NewCircle");
  const [state, formAction, pending] = useActionState(updateCircleAction, {});
  const values = state.values ?? saved;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="circleId" value={circleId} />
      <label className="flex flex-col gap-2">
        <span className="font-bold">{labels("name")}</span>
        <Input name="name" required maxLength={80} defaultValue={values.name} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{labels("firstName")}</span>
        <Input
          name="firstName"
          required
          maxLength={60}
          defaultValue={values.firstName}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{labels("birthDate")}</span>
        <Input
          name="birthDate"
          type="date"
          min="1900-01-01"
          defaultValue={values.birthDate}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{labels("city")}</span>
        <Input
          name="city"
          maxLength={80}
          autoComplete="off"
          defaultValue={values.city}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("address")}</span>
        <span className="text-sm text-muted">{t("addressHint")}</span>
        <Input
          name="address"
          maxLength={160}
          autoComplete="off"
          placeholder={t("addressPlaceholder")}
          defaultValue={values.address}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("doctor")}</span>
        <Input
          name="primaryDoctor"
          maxLength={120}
          autoComplete="off"
          placeholder={t("doctorPlaceholder")}
          defaultValue={values.primaryDoctor}
        />
      </label>
      <Button type="submit" size="lg" disabled={pending}>
        {t("save")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {state.error === "notAllowed"
            ? t("notAllowed")
            : labels(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
