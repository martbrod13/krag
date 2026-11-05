// Checks the translations in messages/:
// - every language file has exactly the same texts as Polish,
// - no text is empty,
// - the languages in src/i18n/config.ts match the files.
import { readdirSync, readFileSync } from "node:fs";

const BASE_LOCALE = "pl";
const messagesDir = new URL("../messages/", import.meta.url);

function flatten(messages, prefix = "") {
  return Object.entries(messages).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}

function load(locale) {
  const file = new URL(`${locale}.json`, messagesDir);
  return new Map(flatten(JSON.parse(readFileSync(file, "utf8"))));
}

const fileLocales = readdirSync(messagesDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.slice(0, -".json".length))
  .sort();

const config = readFileSync(
  new URL("../src/i18n/config.ts", import.meta.url),
  "utf8",
);
const listed = config.match(/export const locales = \[([^\]]*)\]/)?.[1] ?? "";
const configLocales = [...listed.matchAll(/"([^"]+)"/g)]
  .map((match) => match[1])
  .sort();

const problems = [];

if (configLocales.join() !== fileLocales.join()) {
  problems.push(
    `src/i18n/config.ts lists [${configLocales}], but messages/ has [${fileLocales}]`,
  );
}

const base = load(BASE_LOCALE);
for (const locale of fileLocales) {
  const messages = load(locale);
  for (const key of base.keys()) {
    if (!messages.has(key)) {
      problems.push(`messages/${locale}.json: missing ${key}`);
    }
  }
  for (const [key, value] of messages) {
    if (!base.has(key)) {
      problems.push(`messages/${locale}.json: extra ${key}`);
    } else if (typeof value !== "string" || value.trim() === "") {
      problems.push(`messages/${locale}.json: empty ${key}`);
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`OK: ${fileLocales.join(", ")} have the same ${base.size} texts`);
