import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cx(
        "rounded-card border border-line bg-surface p-5",
        className,
      )}
      {...props}
    />
  );
}
