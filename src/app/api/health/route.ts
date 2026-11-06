import { db } from "@/lib/db";

// Shows whether the app can reach the database: open /api/health.
// It never returns any data from the database.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "ok" });
  } catch {
    return Response.json({ ok: false, database: "error" }, { status: 503 });
  }
}
