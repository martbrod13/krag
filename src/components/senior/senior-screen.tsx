import { useTranslations } from "next-intl";
import { confirmSeniorDosesAction } from "@/app/senior/actions";
import { CheckIcon, PhoneIcon } from "@/components/icons";
import { SeniorClock } from "@/components/senior/senior-clock";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { type Contact, telHref } from "@/lib/contacts";
import { cx } from "@/lib/cx";
import type { DoseSlot } from "@/lib/medications";
import type { TaskView } from "@/lib/tasks";
import { type VisitView, isInProgress } from "@/lib/visits";

type SeniorScreenProps = {
  contacts: Contact[];
  /** Today's tasks the family chose to show on the senior screen. */
  plan: TaskView[];
  /** Today's medicines with a reminder, by time. */
  medicines: DoseSlot[];
  /** Today's visits: who comes and when. */
  visits: VisitView[];
  /** In the family's preview the buttons only show what the senior sees. */
  preview?: boolean;
};

const buttonClass =
  "flex min-h-24 w-full items-center gap-5 rounded-3xl bg-brand px-5 py-4 text-left text-white";

/** One of today's tasks on the senior screen. */
function SeniorTaskItem({ task }: { task: TaskView }) {
  const t = useTranslations("Senior");
  return (
    <li
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
          <span className="text-xl text-muted">{task.assignee.name}</span>
        ) : null}
      </span>
      {task.done ? (
        <span className="shrink-0 text-brand">
          <CheckIcon className="size-9" />
          <span className="sr-only">{t("planDone")}</span>
        </span>
      ) : null}
    </li>
  );
}

/** Who comes today: "Przyjdzie Ewa", then "Ewa jest u Ciebie". */
function SeniorVisitItem({ visit }: { visit: VisitView }) {
  const t = useTranslations("Senior");
  const name = visit.visitor?.name ?? "";
  const now = isInProgress(visit);
  const done = visit.actualEnd !== null;
  let label = t("visitComing", { name });
  if (now) label = t("visitNow", { name });
  else if (done) label = t("visitDone", { name });

  return (
    <li
      className={cx(
        "flex items-start gap-4 rounded-3xl border-2 bg-surface p-5",
        now ? "border-brand" : "border-line",
        done && "opacity-60",
      )}
    >
      <span className="text-3xl font-extrabold tabular-nums">
        {visit.startTime}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-2xl font-extrabold break-words">{label}</span>
        {visit.endTime && !done ? (
          <span className="text-xl text-muted">
            {t("visitUntil", { time: visit.endTime })}
          </span>
        ) : null}
      </span>
      {done ? (
        <span className="shrink-0 text-brand">
          <CheckIcon className="size-9" />
        </span>
      ) : null}
    </li>
  );
}

/**
 * What the senior sees: the date and time, today's medicines with one big
 * "taken" button per time, today's visits and plan, and big buttons to call
 * family.
 */
export function SeniorScreen({
  contacts,
  plan,
  medicines,
  visits,
  preview = false,
}: SeniorScreenProps) {
  const t = useTranslations("Senior");

  // Today's visits and tasks together by time; tasks without a time last.
  const dayEntries = [
    ...visits
      .filter((visit) => visit.visitor)
      .map((visit) => ({
        time: visit.startTime,
        item: <SeniorVisitItem key={`visit-${visit.id}`} visit={visit} />,
      })),
    ...plan.map((task) => ({
      time: task.time ?? "99:99",
      item: <SeniorTaskItem key={task.id} task={task} />,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="flex flex-col gap-8">
      {preview ? null : <h1 className="sr-only">{t("title")}</h1>}
      <SeniorClock />

      {medicines.length > 0 ? (
        <section aria-labelledby="meds-title" className="flex flex-col gap-4">
          <h2 id="meds-title" className="text-2xl font-extrabold">
            {t("medsTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            {medicines.map((slot) => {
              const open = slot.state === "due" || slot.state === "soon";
              const takeLabel = (
                <>
                  <CheckIcon className="size-9" />
                  <span>
                    <span className="sr-only">{slot.time} </span>
                    {t("medsTake")}
                  </span>
                </>
              );
              return (
                <li
                  key={slot.time}
                  className={cx(
                    "flex flex-col gap-4 rounded-3xl border-2 bg-surface p-5",
                    open ? "border-brand" : "border-line",
                    slot.state === "taken" && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-3xl font-extrabold tabular-nums">
                      {slot.time}
                    </span>
                    {slot.state === "due" ? (
                      <span className="text-xl font-extrabold text-brand">
                        {t("medsDue")}
                      </span>
                    ) : null}
                    {slot.state === "taken" ? (
                      <span className="flex items-center gap-2 text-xl font-extrabold text-brand">
                        <CheckIcon className="size-7" />
                        {t("medsTaken", { time: slot.takenAt ?? slot.time })}
                      </span>
                    ) : null}
                  </div>
                  <ul className="flex flex-col gap-2">
                    {slot.doses.map((dose) => (
                      <li key={dose.medicationId} className="flex gap-3">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-2xl font-extrabold break-words">
                            {dose.name}
                          </span>
                          {dose.amount || dose.note ? (
                            <span className="text-xl break-words text-muted">
                              {[dose.amount, dose.note]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          ) : null}
                        </span>
                        {dose.taken && slot.state !== "taken" ? (
                          <span className="shrink-0 text-brand">
                            <CheckIcon className="size-8" />
                            <span className="sr-only">
                              {t("medsDoseTaken")}
                            </span>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {open && preview ? (
                    <div
                      className={cx(buttonClasses({ size: "xl" }), "w-full")}
                    >
                      {takeLabel}
                    </div>
                  ) : null}
                  {open && !preview ? (
                    <form action={confirmSeniorDosesAction}>
                      <input type="hidden" name="time" value={slot.time} />
                      <SubmitButton size="xl" className="w-full">
                        {takeLabel}
                      </SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {dayEntries.length > 0 ? (
        <section aria-labelledby="plan-title" className="flex flex-col gap-4">
          <h2 id="plan-title" className="text-2xl font-extrabold">
            {t("planTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            {dayEntries.map((entry) => entry.item)}
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
