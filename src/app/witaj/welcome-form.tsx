"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveName } from "./actions";

export type WelcomeState = { error?: "nameRequired" };

export function WelcomeForm({ next }: { next: string }) {
  const t = useTranslations("Welcome");
  const [state, formAction, pending] = useActionState(saveName, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("nameLabel")}</span>
        <Input name="name" autoComplete="given-name" required maxLength={60} />
      </label>
      <Button type="submit" size="lg" disabled={pending}>
        {t("continue")}
      </Button>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  );
}
