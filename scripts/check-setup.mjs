// Runs automatically before `npm run dev` (the "predev" script).
// When a setup step was skipped, it says in Polish what to do,
// instead of a wall of "Module not found" errors.
import { existsSync, readFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const problems = [];
const warnings = [];

// 1. Every library from package.json is installed, in the version from package-lock.json.
const pkg = readJson("package.json");
const lock = existsSync("package-lock.json")
  ? readJson("package-lock.json")
  : null;
const outdated = Object.keys({
  ...pkg.dependencies,
  ...pkg.devDependencies,
}).filter((name) => {
  const installed = `node_modules/${name}/package.json`;
  if (!existsSync(installed)) return true;
  const expected = lock?.packages?.[`node_modules/${name}`]?.version;
  return Boolean(expected) && readJson(installed).version !== expected;
});
if (outdated.length > 0) {
  problems.push(
    `Brakuje bibliotek albo są w starej wersji (${outdated.slice(0, 3).join(", ")}${outdated.length > 3 ? "…" : ""}).`,
    "Wpisz w terminalu: npm install",
  );
}

// 2. The database client that Prisma generates during npm install.
if (outdated.length === 0 && !existsSync("src/generated/prisma/client.ts")) {
  problems.push(
    "Brakuje klienta bazy danych (folder src/generated).",
    "Wpisz w terminalu: npm install",
  );
}

// 3. The database address. Without it the app starts, but sign-in and data do not work.
const envLocal = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : "";
if (
  !process.env.DATABASE_URL &&
  !/^\s*DATABASE_URL\s*=\s*\S+/m.test(envLocal)
) {
  warnings.push(
    "W pliku .env.local nie ma adresu bazy danych (DATABASE_URL).",
    "Aplikacja się uruchomi, ale logowanie i dane nie będą działać.",
    "Instrukcja: README, część „Baza danych (Neon)”.",
  );
}

function box(title, lines) {
  console.log(`\n  ${title}`);
  for (const line of lines) console.log(`  ${line}`);
  console.log("");
}

if (warnings.length > 0) box("Uwaga:", warnings);
if (problems.length > 0) {
  box("Zanim uruchomisz aplikację:", problems);
  process.exit(1);
}
