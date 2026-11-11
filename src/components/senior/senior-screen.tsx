import { useTranslations } from "next-intl";
import { CheckIcon, PhoneIcon } from "@/components/icons";
import { SeniorClock } from "@/components/senior/senior-clock";
import { type Contact, telHref } from "@/lib/contacts";
import { cx } from "@/lib/cx";
import type { TaskView } from "@/lib/tasks";

type SeniorScreenProps = {
  contacts: Contact[];
  /** Today's tasks the family chose to show on the senior screen. */
  plan: TaskView[];
  /** In the family's preview the buttons only show what the senior sees. */
  preview?: boolean;
};

const buttonClass =
  "flex min-h-24 w-full items-center gap-5 rounded-3xl bg-brand px-5 py-4 text-left text-white";

/**
 * What the senior sees: the date and time, today's plan and big buttons to
 * call family.
 */
export function SeniorScreen({
  contacts,
  plan,
  preview = false,
}: SeniorScreenProps) {
  const t = useTranslations("Senior");

  return (
    <div className="flex flex-col gap-8">
      {preview ? null : <h1 className="sr-only">{t("title")}</h1>}
      <SeniorClock />

      {plan.length > 0 ? (
        <section aria-labelledby="plan-title" className="flex flex-col gap-4">
          <h2 id="plan-title" className="text-2xl font-extrabold">
            {t("planTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            {plan.map((task) => (
              <li
                key={task.id}
                className={cx(
                  "flex items-start gap-4 rounded-3xl border-2 border-line bg-surface p-5",
                  task.done && "opacity-60",
                )}
              >
                {task.time ? (
                  <span className="text-3xl font-extrabold tabular-nums">
                    {task.time}
                  </span>
                ) : null}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-2xl font-extrabold break-words">
                    {task.title}
                  </span>
                  {task.assignee ? (
                    <span className="text-xl text-muted">
                      {task.assignee.name}
                    </span>
                  ) : null}
                </span>
                {task.done ? (
                  <span className="shrink-0 text-brand">
                    <CheckIcon className="size-9" />
                    <span className="sr-only">{t("planDone")}</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="call-title" className="flex flex-col gap-4">
        <h2 id="call-title" className="text-2xl font-extrabold">
          {t("callTitle")}
        </h2>
        {contacts.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {contacts.map((contact) => {
              const content = (
                <>
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <PhoneIcon className="size-8" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-3xl font-extrabold break-words">
                      {contact.name}
                    </span>
                    <span className="text-xl">
                      {contact.relationship ?? contact.phone}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={contact.id}>
                  {preview ? (
                    <div className={buttonClass}>{content}</div>
                  ) : (
                    <a
                      href={telHref(contact.phone)}
                      className={cx(
                        buttonClass,
                        "transition-colors hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand",
                      )}
                    >
                      <span className="sr-only">{t("call")} </span>
                      {content}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xl text-muted">{t("noContacts")}</p>
        )}
      </section>
    </div>
  );
}
