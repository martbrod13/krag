import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma commands do not read env files on their own. Locally the database
// address lives in .env.local (never committed); on GitHub it comes from CI.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
