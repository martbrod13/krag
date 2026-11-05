import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

const tones = {
  brand: "bg-brand-soft text-brand-strong",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-canvas text-muted",
};

type BadgeProps = {
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
