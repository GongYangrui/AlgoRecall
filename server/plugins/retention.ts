import { sql } from "drizzle-orm";
import { db } from "../db";
import { logWarn } from "../utils/logger";

function readRetentionDays() {
  const raw = process.env.LOG_RETENTION_DAYS;
  if (raw === "0" || raw === "false") return 0;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 90;
}

async function cleanupOldEvents(days: number) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  await db.execute(sql`DELETE FROM app_events WHERE timestamp < ${cutoff}`);
  await db.execute(sql`DELETE FROM analytics_events WHERE timestamp < ${cutoff}`);
}

export default defineNitroPlugin(() => {
  const retentionDays = readRetentionDays();
  if (retentionDays <= 0) return;

  const run = () => {
    cleanupOldEvents(retentionDays).catch((error) => {
      logWarn("retention.cleanup_failed", {
        message: error instanceof Error ? error.message : String(error),
        error,
        source: "system",
        operation: "retention.cleanup",
      });
    });
  };

  const initial = setTimeout(run, 60_000);
  initial.unref?.();
  const interval = setInterval(run, 24 * 60 * 60 * 1000);
  interval.unref?.();
});
