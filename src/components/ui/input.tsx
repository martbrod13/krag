import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "min-h-13 w-full rounded-2xl border border-line bg-surface px-4 text-lg text-ink",
        "placeholder:text-muted focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
      {...props}
    />
  );
}
