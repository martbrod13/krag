import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";

// The idea of Krąg in one picture: the senior in the middle and the family
// and caregiver around, each with something they are doing today.
// Positions are on a 400 × 400 grid; people sit on a ring of radius 130.

type Person = {
  initial: string;
  /** Centre of the avatar on the 400 × 400 grid. */
  x: number;
  y: number;
  color: string;
  note: "doctor" | "claim" | "done" | "visit";
  noteAbove?: boolean;
};

const CENTRE = 200;

const people: Person[] = [
  {
    initial: "A",
    x: 135,
    y: 87.4,
    color: "bg-brand",
    note: "doctor",
    noteAbove: true,
  },
  { initial: "T", x: 299.6, y: 116.4, color: "bg-info", note: "claim" },
  { initial: "E", x: 254.9, y: 317.8, color: "bg-warn", note: "done" },
  { initial: "K", x: 82.2, y: 254.9, color: "bg-brand-strong", note: "visit" },
];

const percent = (value: number) => `${(value / 4).toFixed(2)}%`;

const chipClass =
  "rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold whitespace-nowrap text-ink sm:text-sm";

export function CareCircle() {
  const t = useTranslations("Home.circle");

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-md"
    >
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full">
        <circle cx={CENTRE} cy={CENTRE} r="188" className="fill-brand-soft" />
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r="130"
          fill="none"
          className="stroke-brand"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
        <g className="stroke-brand" strokeOpacity="0.18" strokeWidth="2">
          {people.map((person) => (
            <line
              key={person.initial}
              x1={CENTRE}
              y1={CENTRE}
              x2={person.x}
              y2={person.y}
            />
          ))}
        </g>
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r="52"
          className="fill-surface stroke-brand"
          strokeWidth="3"
        />
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r="40"
          fill="none"
          className="stroke-brand"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <text
          x={CENTRE}
          y="212"
          textAnchor="middle"
          className="fill-brand text-[34px] font-extrabold"
        >
          {t("seniorInitial")}
        </text>
      </svg>

      {people.map((person) => (
        <div
          key={person.initial}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: percent(person.x), top: percent(person.y) }}
        >
          <span
            className={cx(
              "flex size-11 items-center justify-center rounded-full text-lg font-extrabold text-white sm:size-13 sm:text-xl",
              person.color,
            )}
          >
            {person.initial}
          </span>
          <span
            className={cx(
              chipClass,
              "absolute left-1/2 -translate-x-1/2",
              person.noteAbove ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
          >
            {t(person.note)}
          </span>
        </div>
      ))}

      <span
        className={cx(chipClass, "absolute -translate-x-1/2 -translate-y-1/2")}
        style={{ left: "50%", top: percent(272) }}
      >
        {t("senior")}
      </span>
    </div>
  );
}
