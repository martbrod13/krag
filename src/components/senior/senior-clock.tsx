"use client";

import { useSyncExternalStore } from "react";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";

const MINUTE_MS = 60_000;

// The clock runs only on the device. The server leaves an empty space, so the
// screen never shows the server's time, and the clock checks every few
// seconds whether the minute has changed.
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, 5_000);
  return () => window.clearInterval(timer);
}

function currentMinute() {
  return Math.floor(Date.now() / MINUTE_MS);
}

function noMinuteOnServer() {
  return null;
}

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return "goodMorning";
  if (hour >= 12 && hour < 18) return "goodAfternoon";
  return "goodEvening";
}

/** Today's date, the time and a greeting, in big letters. */
export function SeniorClock() {
  const t = useTranslations("Senior");
  const format = useFormatter();
  const timeZone = useTimeZone();
  const minute = useSyncExternalStore<number | null>(
    subscribe,
    currentMinute,
    noMinuteOnServer,
  );

  if (minute === null) {
    return <div aria-hidden="true" className="min-h-48" />;
  }

  const now = new Date(minute * MINUTE_MS);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    }).format(now),
  );

  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
      <p className="text-3xl font-extrabold first-letter:uppercase">
        {format.dateTime(now, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>
      <p className="text-7xl font-extrabold tabular-nums">
        {format.dateTime(now, { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-3xl">{t(greetingFor(hour))}</p>
    </div>
  );
}
