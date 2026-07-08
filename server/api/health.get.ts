import { sql } from "drizzle-orm";
import { db } from "../db";
import { getAppVersion, getLogEnvironment } from "../utils/logger";

const globalForMigrations = globalThis as unknown as {
  _algorecallMigrations?: { ok: boolean; checkedAt: string; error?: string };
};

export default defineEventHandler(async (event) => {
  let dbConnected = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  const migrations = globalForMigrations._algorecallMigrations ?? { ok: false, checkedAt: null, error: "not_checked" };
  const ok = dbConnected && migrations.ok;
  if (!ok) setResponseStatus(event, 503);

  return {
    ok,
    db: { connected: dbConnected },
    migrations,
    appVersion: getAppVersion(),
    environment: getLogEnvironment(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
});
