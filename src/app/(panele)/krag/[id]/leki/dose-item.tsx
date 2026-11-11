import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/icons";
import { cx } from "@/lib/cx";
import { type Dose, isMissed } from "@/lib/medications";
import { setDoseTakenAction } from "./actions";

type DoseItemProps = {
  dose: Dose;
  circleId: string;
  /** The time now, HH:MM: a dose an hour late is marked. */
  now: string;
};

/**
 * One of today's doses: a round "taken" button, the time, the medicine and
 * who confirmed it. Tapping the button again takes the confirmation back.
 */
export function DoseItem({ dose, circleId, now }: DoseItemProps) {
  const t = useTranslations("Medications");
  const taken = dose.taken;
  const label = { name: dose.name, time: dose.time };

  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
      <form action={setDoseTakenAction}>
        <input type="hidden" name="circleId" value={circleId} />
        <input type="hidden" name="medicationId" value={dose.medicationId} />
        <input type="hidden" name="time" value={dose.time} />
        <input type="hidden" name="taken" value={taken ? "0" : "1"} />
        <button
          type="submit"
          aria-label={taken ? t("markNotTaken", label) : t("markTaken", label)}
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
            taken
              ? "border-brand bg-brand text-white"
              : "border-line text-transparent hover:border-brand hover:text-brand",
          )}
        >
          <CheckIcon className="size-6" />
        </button>
      </form>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-h-11 flex-wrap items-center gap-x-2 font-bold break-words">
          <span className="tabular-nums">{dose.time}</span>
          <span>{dose.name}</span>
          {dose.amount ? (
            <span className="font-normal text-muted">{dose.amount}</span>
          ) : null}
        </p>
        {dose.note ? <p className="text-sm text-muted">{dose.note}</p> : null}
        {taken ? (
          <p className="text-sm text-muted">
            {taken.bySenior
              ? t("takenBySenior", { time: taken.at })
              : t("takenBy", {
                  time: taken.at,
                  name: taken.by ?? t("someone"),
                })}
          </p>
        ) : isMissed(dose, now) ? (
          <p className="text-sm font-bold text-warn">{t("missed")}</p>
        ) : null}
      </div>
    </li>
  );
}
