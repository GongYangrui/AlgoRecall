import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../db";

export default defineNitroPlugin(async () => {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[migrate] Database migrations completed");
  } catch (error) {
    console.error("[migrate] Migration failed:", error);
  }
});
