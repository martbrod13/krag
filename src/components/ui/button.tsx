import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-ink hover:border-brand",
  danger: "bg-danger text-white hover:bg-danger/90",
};

// Every size is at least 44 px high, so it is easy to tap.
const sizes = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-13 px-5 text-lg",
  xl: "min-h-24 px-6 text-3xl",
};

type ButtonStyle = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
}: ButtonStyle = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:opacity-60",
    variants[variant],
    sizes[size],
  );
}

type ButtonProps = ComponentProps<"button"> & ButtonStyle;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClasses({ variant, size }), className)}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyle;

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(buttonClasses({ variant, size }), className)}
      {...props}
    />
  );
}
