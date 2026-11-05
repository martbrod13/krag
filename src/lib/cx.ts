type ClassValue = string | false | null | undefined;

/** Joins class names and skips empty ones: cx("a", isActive && "b"). */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
