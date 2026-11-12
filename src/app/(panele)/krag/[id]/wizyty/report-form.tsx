"use client";

import { type ReactNode, useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cx } from "@/lib/cx";
import type { SaveReportResult, VisitActivity } from "@/lib/visits";
import { saveReportAction } from "./actions";

export type ReportFormValues = {
  actualStart: string;
  actualEnd: string;
  activities: string[];
  report: string;
};

type ReportError = Exclude<SaveReportResult, "saved"> | "timeInvalid";

export type ReportFormState = {
  error?: ReportError | "notAllowed";
  /** What was typed, shown again after an error. */
  values?: ReportFormValues;
  saved?: boolean;
};

type ReportFormProps = {
  circleId: string;
  visitId: string;
  saved: ReportFormValues;
  /** What can be ticked, in order. */
  activities: readonly VisitActivity[];
  /** A visit in progress ends when the report is saved. */
  ending: boolean;
};

const fieldClass =
  "min-h-13 w-full rounded-2xl border border-line bg-surface px-4 text-lg text-ink placeholder:text-muted focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-bold">{label}</span>
      {children}
    </label>
  );
}

/** The report of the person who came: real times, what was done, how it went. */
export function ReportForm({
  circleId,
  visitId,
  saved,
  activities,
  ending,
}: ReportFormProps) {
  const t = useTranslations("VisitReport");
  const [state, formAction, pending] = useActionState(saveReportAction, {});
  const values = state.values ?? saved;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="circleId" value={circleId} />
      <input type="hidden" name="visitId" value={visitId} />

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("actualStart")}>
          <Input
            name="actualStart"
            type="time"
            required
            defaultValue={values.actualStart}
          />
        </Field>
        <Field label={t("actualEnd")}>
          <Input
            name="actualEnd"
            type="time"
            required
            defaultValue={values.actualEnd}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">{t("done")}</legend>
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => (
            <label
              key={activity}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
            >
              <input
                type="checkbox"
                name={`activity-${activity}`}
                defaultChecked={values.activities.includes(activity)}
                className="size-5 accent-brand"
              />
              {t(`activities.${activity}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={t("report")}>
        <textarea
          name="report"
          rows={5}
          maxLength={2000}
          placeholder={t("reportPlaceholder")}
          defaultValue={values.report}
          className={cx(fieldClass, "py-3")}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {ending ? t("end") : t("save")}
      </Button>
      {state.saved ? (
        <p
          role="status"
          className="rounded-2xl bg-brand-soft p-4 text-brand-strong"
        >
          {t("saved")}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
