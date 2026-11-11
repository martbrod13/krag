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
