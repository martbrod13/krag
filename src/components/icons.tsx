type IconProps = { className?: string };

const strokeProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** A telephone handset. */
export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

/** A tick: something worked. */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} strokeWidth={3} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** A calendar page with a tick: the plan for the day. */
export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18m-12 5 2 2 4-4" />
    </svg>
  );
}

/** A capsule: medicines. */
export function PillIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <rect
        x="2.5"
        y="8"
        width="19"
        height="8"
        rx="4"
        transform="rotate(-45 12 12)"
      />
      <path d="m9.2 9.2 5.6 5.6" />
    </svg>
  );
}

/** A tablet: the senior's screen. */
export function TabletIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  );
}

/** A globe: languages. */
export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

/** A shield with a tick: privacy. */
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...strokeProps} className={className}>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
