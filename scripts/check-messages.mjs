// Checks that every translation has exactly the same keys as Polish,
// so no screen ever shows a missing text in Ukrainian.
import { readFileSync } from "node:fs";

const BASE_LOCALE = "pl";
const OTHER_LOCALES = ["uk"];

function load(locale) {
  const file = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, "utf8"));
}

function keysOf(messages, prefix = "") {
  return Object.entries(messages).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

const baseKeys = new Set(keysOf(load(BASE_LOCALE)));
let ok = true;

for (const locale of OTHER_LOCALES) {
  const keys = new Set(keysOf(load(locale)));
  const missing = [...baseKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !baseKeys.has(key));

  if (missing.length > 0 || extra.length > 0) {
    ok = false;
    console.error(`messages/${locale}.json differs from messages/pl.json:`);
    for (const key of missing) console.error(`  missing: ${key}`);
    for (const key of extra) console.error(`  extra:   ${key}`);
  }
}

if (!ok) process.exit(1);
console.log(
  `OK: ${OTHER_LOCALES.join(", ")} match ${BASE_LOCALE} (${baseKeys.size} keys)`,
);
