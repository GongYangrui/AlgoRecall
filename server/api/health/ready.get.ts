import { sql } from "drizzle-orm";
import journal from "../../../drizzle/meta/_journal.json";
import { db } from "../../db";
import { getAppVersion, getLogEnvironment } from "../../utils/logger";
import { redisPing } from "../../utils/redis";

export default defineEventHandler(async (event) => {
  const checks = { database: false, redis: false, migrations: false };
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = true;
    const result = await db.execute(sql`
      SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations
    `);
    checks.migrations = Number(result.rows[0]?.count) >= journal.entries.length;
  } catch {
    checks.database = false;
  }

  try {
    checks.redis = await redisPing();
  } catch {
    checks.redis = false;
  }

  const ok = Object.values(checks).every(Boolean);
  if (!ok) setResponseStatus(event, 503);
  return {
    ok,
    check: "ready",
    checks,
    appVersion: getAppVersion(),
    environment: getLogEnvironment(),
  };
});
