import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../db";

const globalForMigrations = globalThis as unknown as {
  _algorecallMigrations?: { ok: boolean; checkedAt: string; error?: string };
};

export default defineNitroPlugin(async () => {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    globalForMigrations._algorecallMigrations = { ok: true, checkedAt: new Date().toISOString() };
    console.log("[migrate] Database migrations completed");
  } catch (error) {
    globalForMigrations._algorecallMigrations = {
      ok: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("[migrate] Migration failed:", error);
    throw error;
  }
});
