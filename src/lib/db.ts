import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One database client per server process. In development Next.js reloads
// modules on every change, so the client is kept on globalThis to avoid
// opening a new pool of connections each time.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForDb.db ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
