import { getDatabase } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDatabase().$queryRaw`SELECT 1`;
    return Response.json({ service: "linkwatch-web", status: "ready" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ service: "linkwatch-web", status: "not_ready" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
