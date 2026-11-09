// Smoke test: starts the built app and checks that every page opens in every
// language, that the database answers and that signing in with an email code
// works. Run `npm run build` first.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// Same database address as the app itself: .env.local locally, CI settings on GitHub.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
// Sign-in codes land in this file instead of an inbox (see src/lib/email.ts).
const CODE_LOG = join(tmpdir(), `krag-codes-${process.pid}.jsonl`);
writeFileSync(CODE_LOG, "");

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", String(PORT)],
  {
    stdio: ["ignore", "inherit", "inherit"],
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      BETTER_AUTH_URL: BASE,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? "local-smoke-test-secret-0123456789",
      KRAG_TEST_CODE_LOG: CODE_LOG,
    },
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

async function post(path, body, cookie = "") {
  const response = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, cookie },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const cookies = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");
  return { status: response.status, cookies, text: await response.text() };
}

function redirectsToSignIn(page, path) {
  const location = page.headers.get("location") ?? "";
  return (
    page.status >= 300 &&
    page.status < 400 &&
    location.includes(`/logowanie?next=${encodeURIComponent(path)}`)
  );
}

function lastCodeFor(email) {
  const lines = readFileSync(CODE_LOG, "utf8").trim().split("\n");
  const entries = lines.filter(Boolean).map((line) => JSON.parse(line));
  return entries.filter((entry) => entry.email === email).at(-1)?.code;
}

async function signIn(email, wrongCodeFirst = false) {
  const sent = await post("/api/auth/email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });
  check(sent.status === 200, `a sign-in code is sent to ${email}`);
  const code = lastCodeFor(email);
  check(Boolean(code), `the code for ${email} can be read`);

  if (wrongCodeFirst) {
    const wrong = await post("/api/auth/sign-in/email-otp", {
      email,
      otp: code === "000000" ? "111111" : "000000",
    });
    check(
      wrong.status === 400 && wrong.text.includes("INVALID_OTP"),
      "a wrong code is rejected",
    );
  }

  const result = await post("/api/auth/sign-in/email-otp", {
    email,
    otp: code,
  });
  check(
    result.status === 200 && result.cookies.includes("session_token"),
    `${email} signs in with the right code`,
  );
  return result.cookies;
}

try {
  await waitForServer();
  const polish = { "accept-language": "pl-PL,pl;q=0.9" };

  const pages = [
    ["/", "Zaloguj się albo załóż konto"],
    ["/logowanie", "wyślemy Ci 6-cyfrowy kod"],
    ["/senior", "Dzień dobry!"],
  ];
  for (const [path, text] of pages) {
    const page = await get(path, polish);
    check(page.status === 200 && page.text.includes(text), `${path} opens`);
  }

  for (const path of ["/rodzina", "/opiekun"]) {
    const page = await get(path, polish);
    check(
      redirectsToSignIn(page, path),
      `${path} asks visitors to sign in first`,
    );
  }

  // [browser language, expected app language, text on the start screen]
  const browserLanguages = [
    ["uk-UA,uk;q=0.9", "uk", "Увійти або створити акаунт"],
    ["ru-RU,ru;q=0.9", "ru", "Войти или создать аккаунт"],
    ["en-GB,en;q=0.9", "en", "Sign in or create an account"],
    ["de-DE,de;q=0.9", "pl", "Zaloguj się albo załóż konto"],
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
    saved.text.includes("Sign in or create an account"),
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

  const noSession = await get("/api/auth/get-session");
  check(
    noSession.status === 200 && noSession.text.trim() === "null",
    "the sign-in service answers",
  );

  const health = await get("/api/health");
  if (!process.env.DATABASE_URL) {
    check(
      health.status === 503 && health.text.includes('"database":"error"'),
      "without a database the health check reports an error",
    );
  } else {
    check(
      health.status === 200 && health.text.includes('"database":"ok"'),
      "the database answers",
    );

    // Ania from the test data: coordinator of the circle "Mama Halina".
    const ania = await signIn("ania.kowalska@example.com", true);
    const family = await get("/rodzina", { ...polish, cookie: ania });
    check(
      family.status === 200 &&
        family.text.includes("Mama Halina") &&
        family.text.includes("Koordynator kręgu"),
      "after signing in Ania sees her circle",
    );

    const signedOut = await post("/api/auth/sign-out", {}, ania);
    check(signedOut.status === 200, "Ania signs out");
    const afterSignOut = await get("/rodzina", { ...polish, cookie: ania });
    check(
      redirectsToSignIn(afterSignOut, "/rodzina"),
      "after signing out the panel asks to sign in again",
    );

    // A new person gets an account and is asked for a first name.
    await sleep(10_000); // stay under the sign-in rate limit
    const newcomer = await signIn("nowa.osoba@example.com");
    const welcome = await get("/rodzina", { ...polish, cookie: newcomer });
    const location = welcome.headers.get("location") ?? "";
    check(
      welcome.status >= 300 &&
        welcome.status < 400 &&
        location.includes("/witaj?next=%2Frodzina"),
      "a new person is asked for a first name",
    );
  }
} catch (error) {
  console.error(error);
  failures++;
} finally {
  server.kill();
  rmSync(CODE_LOG, { force: true });
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All smoke checks passed");
