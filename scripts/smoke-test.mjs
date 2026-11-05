// Smoke test: starts the built app and checks that every page opens in
// every language and that the database answers. Run `npm run build` first.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// Same database address as the app itself: .env.local locally, CI settings on GitHub.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3123;
const BASE = `http://localhost:${PORT}`;

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", String(PORT)],
  {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);

let failures = 0;

function check(ok, description) {
  console.log(`${ok ? "ok  " : "FAIL"} ${description}`);
  if (!ok) failures++;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(BASE);
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("The app did not start within 30 seconds");
}

async function get(path, headers = {}) {
  const response = await fetch(BASE + path, { headers, redirect: "manual" });
  return {
    status: response.status,
    headers: response.headers,
    text: await response.text(),
  };
}

try {
  await waitForServer();
  const polish = { "accept-language": "pl-PL,pl;q=0.9" };

  const pages = [
    ["/", "Wybierz panel"],
    ["/rodzina", "Dziś"],
    ["/opiekun", "Mój dzień"],
    ["/senior", "Dzień dobry!"],
  ];
  for (const [path, text] of pages) {
    const page = await get(path, polish);
    check(page.status === 200 && page.text.includes(text), `${path} opens`);
  }

  // [browser language, expected app language, text on the start screen]
  const browserLanguages = [
    ["uk-UA,uk;q=0.9", "uk", "Оберіть панель"],
    ["ru-RU,ru;q=0.9", "ru", "Выберите панель"],
    ["en-GB,en;q=0.9", "en", "Choose a panel"],
    ["de-DE,de;q=0.9", "pl", "Wybierz panel"],
  ];
  for (const [acceptLanguage, lang, text] of browserLanguages) {
    const page = await get("/", { "accept-language": acceptLanguage });
    check(
      page.text.includes(text) && page.text.includes(`lang="${lang}"`),
      `a browser set to "${acceptLanguage}" gets "${lang}"`,
    );
  }

  const saved = await get("/", {
    "accept-language": "uk-UA,uk;q=0.9",
    cookie: "NEXT_LOCALE=en",
  });
  check(
    saved.text.includes("Choose a panel"),
    "the language chosen in the app wins over the browser language",
  );

  const greetings = {
    pl: "Dzień dobry!",
    uk: "Добрий день!",
    ru: "Добрый день!",
    en: "Hello!",
  };
  for (const [locale, greeting] of Object.entries(greetings)) {
    const page = await get("/senior", { cookie: `NEXT_LOCALE=${locale}` });
    check(page.text.includes(greeting), `/senior opens in "${locale}"`);
  }

  const missing = await get("/nie-ma-takiej-strony", polish);
  check(
    missing.status === 404 && missing.text.includes("Nie ma takiej strony"),
    "an unknown address shows the 404 page",
  );

  const manifest = await get("/manifest.webmanifest");
  check(
    manifest.status === 200 && manifest.text.includes("Krąg"),
    "the app manifest is served",
  );

  for (const path of ["/favicon.ico", "/icons/icon-512.png"]) {
    check((await get(path)).status === 200, `${path} is served`);
  }

  const home = await get("/", polish);
  check(
    home.headers.get("x-frame-options") === "DENY" &&
      home.headers.get("x-content-type-options") === "nosniff",
    "security headers are set",
  );
  check(!home.headers.has("x-powered-by"), "the X-Powered-By header is hidden");

  const health = await get("/api/health");
  if (process.env.DATABASE_URL) {
    check(
      health.status === 200 && health.text.includes('"database":"ok"'),
      "the database answers",
    );
  } else {
    check(
      health.status === 503 && health.text.includes('"database":"error"'),
      "without a database the health check reports an error",
    );
  }
} catch (error) {
  console.error(error);
  failures++;
} finally {
  server.kill();
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All smoke checks passed");
