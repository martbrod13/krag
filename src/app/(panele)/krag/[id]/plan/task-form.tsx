"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cx } from "@/lib/cx";
import type { TaskError } from "@/lib/tasks";
import { saveTaskAction } from "./actions";

export type TaskFormState = {
  error?: TaskError | "notAllowed" | "notFound";
  /** What was typed, shown again after an error. */
  values?: Record<string, string>;
};

/** The form's starting values; showToSenior is "on" or "". */
export type TaskFormValues = {
  title: string;
  date: string;
  time: string;
  assigneeId: string;
  note: string;
  showToSenior: string;
};

type TaskFormProps = {
  circleId: string;
  /** Set when changing an existing task. */
  taskId?: string;
  saved: TaskFormValues;
  people: { id: string; name: string }[];
};

const fieldClass =
  "min-h-13 w-full rounded-2xl border border-line bg-surface px-4 text-lg text-ink focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function TaskForm({ circleId, taskId, saved, people }: TaskFormProps) {
  const t = useTranslations("TaskForm");
  const [state, formAction, pending] = useActionState(saveTaskAction, {});
  const values = state.values ?? saved;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="circleId" value={circleId} />
      {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}

      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("title")}</span>
        <Input
          name="title"
          required
          maxLength={120}
          autoComplete="off"
          placeholder={t("titlePlaceholder")}
          defaultValue={values.title}
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="font-bold">{t("date")}</span>
            <Input name="date" type="date" defaultValue={values.date} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-bold">{t("time")}</span>
            <Input
              name="time"
              type="time"
              step={300}
              defaultValue={values.time}
            />
          </label>
        </div>
        <p className="text-sm text-muted">{t("whenHint")}</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("assignee")}</span>
        <select
          name="assigneeId"
          defaultValue={values.assigneeId}
          className={fieldClass}
        >
          <option value="">{t("nobody")}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("note")}</span>
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          defaultValue={values.note}
          className={cx(fieldClass, "py-3")}
        />
      </label>

      <label className="flex cursor-pointer gap-3 rounded-card border border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
        <input
          type="checkbox"
          name="showToSenior"
          defaultChecked={values.showToSenior === "on"}
          className="mt-1 size-5 shrink-0 accent-brand"
        />
        <span className="flex flex-col gap-1">
          <span className="font-bold">{t("showToSenior")}</span>
          <span className="text-muted">{t("showToSeniorHint")}</span>
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending}>
        {taskId ? t("save") : t("add")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
