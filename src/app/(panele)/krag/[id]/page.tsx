import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { PhoneIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { telHref } from "@/lib/contacts";
import { todayInPoland } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getPlan } from "@/lib/tasks";
import {
  cancelInvitationAction,
  leaveCircleAction,
  unpairDeviceAction,
} from "../actions";
import { TaskItem } from "./plan/task-item";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Circles");
  return { title: t("pageTitle") };
}

export default async function CirclePage({ params }: PageProps<"/krag/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();

  const seesProfile = circle.permissions.includes("PROFILE");
  if (circle.recipient && seesProfile) {
    await logAccess({
      circleId: circle.id,
      userId: user.id,
      action: "VIEW",
      entity: "CareRecipient",
    });
  }

  const today = todayInPoland();
  const plan = circle.permissions.includes("TASKS")
    ? await getPlan(circle.id, today)
    : null;

  const t = await getTranslations("Circles");
  const planText = await getTranslations("Plan");
  const common = await getTranslations("Common");
  const format = await getFormatter();
  const recipient = circle.recipient;
  const contacts = circle.contacts;
  const manages = circle.permissions.includes("MANAGE");
  const panel = circle.role === "CAREGIVER" ? "/opiekun" : "/rodzina";
  const onlyCoordinator =
    circle.role === "COORDINATOR" &&
    circle.members.filter((member) => member.role === "COORDINATOR").length <=
      1;

  return (
    <>
      <Link href={panel} className="font-bold text-brand hover:underline">
        ← {t("backToPanel")}
      </Link>

      <div className="flex flex-col items-start gap-2">
        <Badge tone={circle.role === "CAREGIVER" ? "info" : "brand"}>
          {t(`roles.${circle.role}`)}
        </Badge>
        <h1 className="text-3xl font-extrabold">{circle.name}</h1>
      </div>

      {plan ? (
        <section aria-labelledby="today" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today" className="text-xl font-extrabold">
              {planText("todayTitle")}
            </h2>
            <Link
              href={`/krag/${circle.id}/plan`}
              className="flex min-h-11 items-center font-bold text-brand hover:underline"
            >
              {planText("fullPlan")}
            </Link>
          </div>
          {plan.overdue.length > 0 ? (
            <Link
              href={`/krag/${circle.id}/plan`}
              className="rounded-2xl bg-danger-soft p-3 font-bold text-danger hover:underline"
            >
              {planText("overdueCount", { count: plan.overdue.length })}
            </Link>
          ) : null}
          {plan.today.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {plan.today.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  circleId={circle.id}
                  userId={user.id}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted">{planText("nothingToday")}</p>
          )}
          <ButtonLink
            href={`/krag/${circle.id}/plan/nowe?dzien=${today}`}
            variant="secondary"
          >
            {planText("addToday")}
          </ButtonLink>
        </section>
      ) : null}

      {recipient ? (
        <Card className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
              {t("recipientTitle")}
            </h2>
            {manages ? (
              <Link
                href={`/krag/${circle.id}/dane`}
                className="flex min-h-11 items-center font-bold text-brand hover:underline"
              >
                {t("editRecipient")}
              </Link>
            ) : null}
          </div>
          <p className="text-2xl font-extrabold">
            {recipient.age === null
              ? recipient.firstName
              : t("recipientWithAge", {
                  name: recipient.firstName,
                  age: recipient.age,
                })}
          </p>
          {recipient.city ? <p className="text-lg">{recipient.city}</p> : null}
          {recipient.address ? (
            <p className="text-muted">{recipient.address}</p>
          ) : null}
          {recipient.primaryDoctor ? (
            <p className="text-muted">
              {t("doctor", { doctor: recipient.primaryDoctor })}
            </p>
          ) : null}
        </Card>
      ) : null}

      {contacts ? (
        <section aria-labelledby="contacts" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="contacts" className="text-xl font-extrabold">
              {t("contactsTitle")}
            </h2>
            {manages ? (
              <Link
                href={`/krag/${circle.id}/numery`}
                className="flex min-h-11 items-center font-bold text-brand hover:underline"
              >
                {t("editContacts")}
              </Link>
            ) : null}
          </div>
          {contacts.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <span className="flex flex-col">
                    <span className="font-bold">
                      {contact.name}
                      {contact.relationship ? (
                        <span className="font-normal text-muted">
                          {" · "}
                          {contact.relationship}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted">{contact.phone}</span>
                  </span>
                  <a
                    href={telHref(contact.phone)}
                    aria-label={t("callContact", { name: contact.name })}
                    className={buttonClasses({ variant: "secondary" })}
                  >
                    <PhoneIcon className="size-5 text-brand" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              {manages ? t("noContactsManage") : t("noContacts")}
            </p>
          )}
        </section>
      ) : null}

      {contacts ? (
        <section aria-labelledby="senior" className="flex flex-col gap-3">
          <h2 id="senior" className="text-xl font-extrabold">
            {t("seniorTitle")}
          </h2>
          <p className="text-muted">{t("seniorLead")}</p>
          {circle.devices && circle.devices.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {circle.devices.map((device) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <span className="flex flex-col">
                    <span className="font-bold">{device.name}</span>
                    <span className="text-sm text-muted">
                      {t("devicePaired", {
                        date: format.dateTime(device.pairedAt, {
                          day: "numeric",
                          month: "long",
                        }),
                      })}
                      {device.lastUsedAt ? (
                        <>
                          {" · "}
                          {t("deviceLastUsed", {
                            date: format.dateTime(device.lastUsedAt, {
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                            }),
                          })}
                        </>
                      ) : null}
                    </span>
                  </span>
                  <form action={unpairDeviceAction}>
                    <input type="hidden" name="circleId" value={circle.id} />
                    <input type="hidden" name="deviceId" value={device.id} />
                    <ConfirmButton
                      label={t("unpair")}
                      confirmLabel={t("confirmUnpair")}
                      cancelLabel={common("cancel")}
                    />
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {manages ? (
              <ButtonLink href={`/krag/${circle.id}/polacz`} size="lg">
                {t("pairDevice")}
              </ButtonLink>
            ) : null}
            <ButtonLink
              href={`/krag/${circle.id}/podglad`}
              size="lg"
              variant="secondary"
            >
              {t("seniorPreview")}
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-xl font-extrabold">
          {t("membersTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {circle.members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="font-bold">
                {member.name}
                {member.userId === user.id ? (
                  <span className="font-normal text-muted"> ({t("you")})</span>
                ) : null}
              </span>
              <Badge tone={member.role === "CAREGIVER" ? "info" : "neutral"}>
                {t(`roles.${member.role}`)}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      {circle.invitations ? (
        <section aria-labelledby="invitations" className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/krag/${circle.id}/zapros`} size="lg">
              {t("invite")}
            </ButtonLink>
            <ButtonLink
              href={`/krag/${circle.id}/ustawienia`}
              size="lg"
              variant="secondary"
            >
              {t("settings")}
            </ButtonLink>
          </div>
          {circle.invitations.length > 0 ? (
            <>
              <h2 id="invitations" className="text-xl font-extrabold">
                {t("pendingTitle")}
              </h2>
              <ul className="flex flex-col gap-2">
                {circle.invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                  >
                    <span>
                      <span className="font-bold">
                        {t(`roles.${invitation.role}`)}
                      </span>
                      <span className="text-muted">
                        {" · "}
                        {t("validUntil", {
                          date: format.dateTime(invitation.expiresAt, {
                            day: "numeric",
                            month: "long",
                          }),
                        })}
                      </span>
                    </span>
                    <form action={cancelInvitationAction}>
                      <input type="hidden" name="circleId" value={circle.id} />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invitation.id}
                      />
                      <button
                        type="submit"
                        className={buttonClasses({ variant: "secondary" })}
                      >
                        {t("cancelInvitation")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section
        aria-labelledby="leave"
        className="flex flex-col gap-3 border-t border-line pt-6"
      >
        <h2 id="leave" className="text-lg font-extrabold">
          {t("leaveTitle")}
        </h2>
        {onlyCoordinator ? (
          <p className="text-muted">{t("onlyCoordinatorLeave")}</p>
        ) : (
          <>
            <p className="text-muted">{t("leaveLead")}</p>
            <form action={leaveCircleAction}>
              <input type="hidden" name="circleId" value={circle.id} />
              <input type="hidden" name="panel" value={panel} />
              <ConfirmButton
                label={t("leave")}
                confirmLabel={t("confirmLeave")}
                cancelLabel={common("cancel")}
              />
            </form>
          </>
        )}
      </section>
    </>
  );
}
