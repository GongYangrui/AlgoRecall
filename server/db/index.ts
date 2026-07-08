import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _algorecallPool?: Pool;
  _algorecallDb?: ReturnType<typeof drizzle>;
};

function readPositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getPool() {
  if (!globalForDb._algorecallPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    globalForDb._algorecallPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: readPositiveIntEnv("PG_POOL_MAX", 10),
      connectionTimeoutMillis: readPositiveIntEnv("PG_CONNECTION_TIMEOUT_MS", 5000),
      idleTimeoutMillis: readPositiveIntEnv("PG_IDLE_TIMEOUT_MS", 30_000),
      statement_timeout: readPositiveIntEnv("PG_STATEMENT_TIMEOUT_MS", 15_000),
      query_timeout: readPositiveIntEnv("PG_QUERY_TIMEOUT_MS", 20_000),
    });
  }

  return globalForDb._algorecallPool;
}

function getDb() {
  if (!globalForDb._algorecallDb) {
    globalForDb._algorecallDb = drizzle(getPool(), {
      schema: { ...schema, ...authSchema },
    });
  }

  return globalForDb._algorecallDb;
}

export const db = getDb();
export { getDb };
export * as schema from "./schema";
