"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CircleRole, Permission } from "@/generated/prisma/client";
import {
  DEFAULT_PERMISSIONS,
  EDITABLE_PERMISSIONS,
  ROLES,
} from "@/lib/permissions";
import { updateMemberAction } from "./actions";

type MemberFormError = "notAllowed" | "notFound" | "lastCoordinator";
type Saved = { status: "saved" };
type Failed = { status: "error"; error: MemberFormError };
export type MemberFormResult = Saved | Failed;

type MemberFormProps = {
  circleId: string;
  memberId: string;
  role: CircleRole;
  permissions: Permission[];
};

const optionClass =
  "flex cursor-pointer gap-3 rounded-2xl border border-line bg-surface p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft";

/**
 * A member's role and what they see. Choosing another role sets the
 * checkboxes to that role's defaults, which can then be changed.
 */
export function MemberForm({
  circleId,
  memberId,
  role: savedRole,
  permissions: savedPermissions,
}: MemberFormProps) {
  const t = useTranslations("Settings");
  const [role, setRole] = useState(savedRole);
  const [permissions, setPermissions] = useState(savedPermissions);
  const [result, setResult] = useState<MemberFormResult | null>(null);
  const [pending, startTransition] = useTransition();

  function chooseRole(next: CircleRole) {
    setRole(next);
    setPermissions(DEFAULT_PERMISSIONS[next]);
    setResult(null);
  }

  function toggle(permission: Permission, on: boolean) {
    setPermissions((current) =>
      on
        ? [...current, permission]
        : current.filter((item) => item !== permission),
    );
    setResult(null);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const outcome = await updateMemberAction({
        circleId,
        memberId,
        role,
        permissions,
      });
      setResult(outcome);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">{t("roleLabel")}</legend>
        {ROLES.map((option) => (
          <label key={option} className={optionClass}>
            <input
              type="radio"
              name={`role-${memberId}`}
              value={option}
              checked={role === option}
              onChange={() => chooseRole(option)}
              className="mt-1 size-5 shrink-0 accent-brand"
            />
            <span className="flex flex-col">
              <span className="font-bold">{t(`roles.${option}.title`)}</span>
              <span className="text-sm text-muted">
                {t(`roles.${option}.description`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">{t("permissionsLabel")}</legend>
        {role === "COORDINATOR" ? (
          <p className="text-muted">{t("coordinatorSeesAll")}</p>
        ) : (
          EDITABLE_PERMISSIONS.map((permission) => (
            <label key={permission} className={optionClass}>
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={(event) => toggle(permission, event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-brand"
              />
              <span className="flex flex-col">
                <span className="font-bold">
                  {t(`permissions.${permission}.title`)}
                </span>
                <span className="text-sm text-muted">
                  {t(`permissions.${permission}.description`)}
                </span>
              </span>
            </label>
          ))
        )}
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {t("save")}
      </Button>
      {result?.status === "error" ? (
        <p role="alert" className="rounded-2xl bg-danger-soft p-4 text-danger">
          {t(`errors.${result.error}`)}
        </p>
      ) : result?.status === "saved" ? (
        <p
          role="status"
          className="rounded-2xl bg-brand-soft p-4 text-brand-strong"
        >
          {t("saved")}
        </p>
      ) : null}
    </form>
  );
}
