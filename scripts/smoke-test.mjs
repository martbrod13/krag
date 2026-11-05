// Smoke test: starts the built app and checks that every page opens,
// in Polish and in Ukrainian. Run `npm run build` first.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

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

  const ukrainian = await get("/", { "accept-language": "uk-UA,uk;q=0.9" });
  check(
    ukrainian.text.includes("Оберіть панель") &&
      ukrainian.text.includes('lang="uk"'),
    "a browser set to Ukrainian gets Ukrainian",
  );

  const saved = await get("/", {
    "accept-language": "uk-UA,uk;q=0.9",
    cookie: "NEXT_LOCALE=pl",
  });
  check(
    saved.text.includes("Wybierz panel"),
    "the language chosen in the app wins over the browser language",
  );

  const english = await get("/", { "accept-language": "en-US,en;q=0.9" });
  check(
    english.text.includes("Wybierz panel") &&
      english.text.includes('lang="pl"'),
    "other languages fall back to Polish",
  );

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
