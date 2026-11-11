"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCircleAction } from "./actions";

export type DeleteCircleState = { error?: "nameMismatch" | "notAllowed" };

type DeleteCircleFormProps = { circleId: string; circleName: string };

/** Deleting a circle cannot be undone, so the coordinator types its name. */
export function DeleteCircleForm({
  circleId,
  circleName,
}: DeleteCircleFormProps) {
  const t = useTranslations("Settings");
  const [state, formAction, pending] = useActionState(deleteCircleAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="circleId" value={circleId} />
      <label className="flex flex-col gap-2">
        <span className="font-bold">
          {t("deleteConfirm", { name: circleName })}
        </span>
        <Input name="confirmName" required autoComplete="off" />
      </label>
      <Button type="submit" variant="danger" size="lg" disabled={pending}>
        {t("delete")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
