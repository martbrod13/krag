// Care happens in Poland, so the days and times in the plan are Polish time.
// A day is passed around as text, YYYY-MM-DD, and stored as a database date
// (midnight UTC). That keeps it the same day whatever time zone a server or
// a phone is in.

export const PLAN_TIME_ZONE = "Europe/Warsaw";

const dayParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: PLAN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's day in Poland, e.g. "2026-11-11". */
export function todayInPoland(now = new Date()) {
  const parts = Object.fromEntries(
    dayParts.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** A day as the database stores it (@db.Date): midnight UTC. */
export function dayToDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

/** The day of a date stored by the database. */
export function dateToDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** The day `count` days after a day (before it, if `count` is negative). */
export function addDays(day: string, count: number) {
  const date = dayToDate(day);
  date.setUTCDate(date.getUTCDate() + count);
  return dateToDay(date);
}

/** Whether text is a real day written as YYYY-MM-DD. */
export function isDay(text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = dayToDate(text);
  return !Number.isNaN(date.getTime()) && dateToDay(date) === text;
}

/** Whether text is a time of day written as HH:MM. */
export function isTime(text: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

/**
 * Noon UTC of a day: formatted in Polish time it is still the same day,
 * also when the clocks change.
 */
export function dayForDisplay(day: string) {
  return new Date(`${day}T12:00:00Z`);
}
