"use client";

import {
  type MouseEvent,
  type ReactNode,
  useActionState,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MedicationError } from "@/lib/medications";
import { saveMedicationAction } from "./actions";
import type { MedicationFormValues } from "./form-values";

export type MedicationFormState = {
  error?: MedicationError | "notAllowed" | "notFound";
  /** What was typed, shown again after an error. */
  values?: MedicationFormValues;
};

type MedicationFormProps = {
  circleId: string;
  /** Set when changing an existing medicine. */
  medicationId?: string;
  saved: MedicationFormValues;
  /** Short names of the days of the week, Monday first. */
  weekdayNames: string[];
  /** How many times a day the form offers at most. */
  maxTimes: number;
};

const cardClass =
  "flex cursor-pointer gap-3 rounded-card border border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft";

function Choice(props: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className={cardClass}>
      <input
        type="radio"
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        className="mt-1 size-5 shrink-0 accent-brand"
      />
      <span className="flex flex-col gap-1">
        <span className="font-bold">{props.label}</span>
        {props.hint ? <span className="text-muted">{props.hint}</span> : null}
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-bold">{label}</span>
      {children}
    </label>
  );
}

/** Empties both fields of one time, so the time is left out when saving. */
function clearTime(event: MouseEvent<HTMLButtonElement>) {
  const row = event.currentTarget.closest("[data-time-row]");
  for (const input of row?.querySelectorAll("input") ?? []) input.value = "";
}

export function MedicationForm({
  circleId,
  medicationId,
  saved,
  weekdayNames,
  maxTimes,
}: MedicationFormProps) {
  const t = useTranslations("MedicationForm");
  const [state, formAction, pending] = useActionState(saveMedicationAction, {});
  const values = state.values ?? saved;
  const [schedule, setSchedule] = useState(values.schedule);
  const [days, setDays] = useState(values.days);
  // Times are only added; one is removed by emptying it.
  const [timeCount, setTimeCount] = useState(Math.max(1, values.times.length));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="circleId" value={circleId} />
      {medicationId ? (
        <input type="hidden" name="medicationId" value={medicationId} />
      ) : null}

      <Field label={t("name")}>
        <Input
          name="name"
          required
          maxLength={100}
          autoComplete="off"
          placeholder={t("namePlaceholder")}
          defaultValue={values.name}
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-bold">{t("when")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice
            name="schedule"
            value="times"
            checked={schedule === "times"}
            onChange={() => setSchedule("times")}
            label={t("atTimes")}
          />
          <Choice
            name="schedule"
            value="asNeeded"
            checked={schedule === "asNeeded"}
            onChange={() => setSchedule("asNeeded")}
            label={t("asNeeded")}
            hint={t("asNeededHint")}
          />
        </div>

        <div
          className={schedule === "times" ? "flex flex-col gap-3" : "hidden"}
        >
          {Array.from({ length: timeCount }, (_, index) => (
            <div key={index} data-time-row className="flex items-end gap-2">
              <div className="w-32 shrink-0">
                <Field label={t("time")}>
                  <Input
                    name={`time${index}`}
                    type="time"
                    step={300}
                    defaultValue={values.times[index]?.time ?? ""}
                  />
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label={t("amount")}>
                  <Input
                    name={`amount${index}`}
                    maxLength={40}
                    autoComplete="off"
                    placeholder={t("amountPlaceholder")}
                    defaultValue={values.times[index]?.amount ?? ""}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={clearTime}
                aria-label={t("clearTime", { number: index + 1 })}
                className="flex size-13 shrink-0 items-center justify-center rounded-2xl text-2xl text-muted hover:bg-canvas hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                ×
              </button>
            </div>
          ))}
          {timeCount < maxTimes ? (
            <Button
              variant="secondary"
              onClick={() => setTimeCount(timeCount + 1)}
              className="self-start"
            >
              {t("addTime")}
            </Button>
          ) : null}

          <fieldset className="flex flex-col gap-3 pt-2">
            <legend className="mb-2 font-bold">{t("days")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice
                name="days"
                value="every"
                checked={days === "every"}
                onChange={() => setDays("every")}
                label={t("everyDay")}
              />
              <Choice
                name="days"
                value="chosen"
                checked={days === "chosen"}
                onChange={() => setDays("chosen")}
                label={t("chosenDays")}
              />
            </div>
            <div
              className={days === "chosen" ? "flex flex-wrap gap-2" : "hidden"}
            >
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
          </fieldset>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("startDate")}>
            <Input
              name="startDate"
              type="date"
              defaultValue={values.startDate}
            />
          </Field>
          <Field label={t("endDate")}>
            <Input name="endDate" type="date" defaultValue={values.endDate} />
          </Field>
        </div>
        <p className="text-sm text-muted">{t("datesHint")}</p>
      </div>

      <Field label={t("note")}>
        <Input
          name="note"
          maxLength={200}
          autoComplete="off"
          placeholder={t("notePlaceholder")}
          defaultValue={values.note}
        />
      </Field>

      <label className={cardClass}>
        <input
          type="checkbox"
          name="showToSenior"
          defaultChecked={values.showToSenior}
          className="mt-1 size-5 shrink-0 accent-brand"
        />
        <span className="flex flex-col gap-1">
          <span className="font-bold">{t("showToSenior")}</span>
          <span className="text-muted">{t("showToSeniorHint")}</span>
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending}>
        {medicationId ? t("save") : t("add")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
