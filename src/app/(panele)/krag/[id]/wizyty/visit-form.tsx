"use client";

import { type ReactNode, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cx } from "@/lib/cx";
import type { VisitError } from "@/lib/visits";
import { saveVisitAction } from "./actions";

/** The form's fields as text; days of the week are 1 = Monday … 7 = Sunday. */
export type VisitFormValues = {
  date: string;
  startTime: string;
  endTime: string;
  visitorId: string;
  plan: string;
  /** "" for no repeat, otherwise a number of weeks. */
  repeatWeeks: string;
  weekdays: number[];
};

export type VisitFormState = {
  error?: VisitError | "notAllowed" | "notFound";
  /** What was typed, shown again after an error. */
  values?: VisitFormValues;
};

type VisitFormProps = {
  circleId: string;
  /** Set when changing an existing visit; a new visit can repeat. */
  visitId?: string;
  saved: VisitFormValues;
  /** Who can come; empty for a caregiver, who plans only their own visits. */
  people: { id: string; name: string }[];
  /** Short names of the days of the week, Monday first. */
  weekdayNames: string[];
  /** Weeks a new visit can repeat for. */
  repeatWeeks: number[];
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-bold">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  "min-h-13 w-full rounded-2xl border border-line bg-surface px-4 text-lg text-ink placeholder:text-muted focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function VisitForm({
  circleId,
  visitId,
  saved,
  people,
  weekdayNames,
  repeatWeeks,
}: VisitFormProps) {
  const t = useTranslations("VisitForm");
  const [state, formAction, pending] = useActionState(saveVisitAction, {});
  const values = state.values ?? saved;
  const [repeat, setRepeat] = useState(values.repeatWeeks);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="circleId" value={circleId} />
      {visitId ? <input type="hidden" name="visitId" value={visitId} /> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Field label={t("date")}>
            <Input
              name="date"
              type="date"
              required
              defaultValue={values.date}
            />
          </Field>
        </div>
        <Field label={t("startTime")}>
          <Input
            name="startTime"
            type="time"
            step={300}
            required
            defaultValue={values.startTime}
          />
        </Field>
        <Field label={t("endTime")}>
          <Input
            name="endTime"
            type="time"
            step={300}
            defaultValue={values.endTime}
          />
        </Field>
      </div>

      {people.length > 0 ? (
        <Field label={t("visitor")}>
          <select
            name="visitorId"
            required
            defaultValue={values.visitorId}
            className={fieldClass}
          >
            <option value="" disabled>
              {t("chooseVisitor")}
            </option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label={t("plan")}>
        <textarea
          name="plan"
          rows={3}
          maxLength={500}
          placeholder={t("planPlaceholder")}
          defaultValue={values.plan}
          className={cx(fieldClass, "py-3")}
        />
      </Field>

      {visitId ? null : (
        <div className="flex flex-col gap-3">
          <Field label={t("repeat")}>
            <select
              name="repeatWeeks"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              className={fieldClass}
            >
              <option value="">{t("noRepeat")}</option>
              {repeatWeeks.map((weeks) => (
                <option key={weeks} value={String(weeks)}>
                  {t("repeatFor", { weeks })}
                </option>
              ))}
            </select>
          </Field>
          <div className={repeat ? "flex flex-col gap-2" : "hidden"}>
            <div className="flex flex-wrap gap-2">
              {weekdayNames.map((dayName, index) => (
                <label
                  key={dayName}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 font-bold has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                >
                  <input
                    type="checkbox"
                    name={`weekday${index + 1}`}
                    defaultChecked={values.weekdays.includes(index + 1)}
                    className="size-5 accent-brand"
                  />
                  {dayName}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted">{t("repeatHint")}</p>
          </div>
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {visitId ? t("save") : t("add")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
