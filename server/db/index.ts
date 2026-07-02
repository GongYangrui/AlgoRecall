import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _algorecallPool?: Pool;
  _algorecallDb?: ReturnType<typeof drizzle>;
};

function getPool() {
  if (!globalForDb._algorecallPool) {
    globalForDb._algorecallPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
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
