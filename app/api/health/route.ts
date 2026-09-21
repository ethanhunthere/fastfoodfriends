/**
 * Server-only diagnostics endpoint (NOT indexed via robots).
 * Exposes non-sensitive info so ops can confirm ntfy.sh wiring is live without
 * placing the topic name itself in the client bundle.
 */
import { getNotificationConfig } from "@/lib/ntfy";

export const runtime = "nodejs";

export async function GET() {
  const config = getNotificationConfig();
  return Response.json(
    {
      status: "ok",
      service: "fastfoodfriends-ordering",
      notification: config,
      now: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
