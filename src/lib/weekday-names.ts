import { getFormatter } from "next-intl/server";
import { addDays, dayForDisplay } from "@/lib/dates";

/** 1 January 2024 was a Monday. */
const MONDAY = "2024-01-01";

/** Short names of the days of the week in the user's language, Monday first. */
export async function weekdayNames() {
  const format = await getFormatter();
  return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
    format.dateTime(dayForDisplay(addDays(MONDAY, offset)), {
      weekday: "short",
    }),
  );
}
