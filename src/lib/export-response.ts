import { todayInPoland } from "@/lib/dates";

/**
 * A JSON file to download, made for this request only: never cached and
 * never stored on the server.
 */
export function jsonDownload(data: unknown, name: string) {
  const fileName = `krag-${name}-${todayInPoland()}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
