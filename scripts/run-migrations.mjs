#!/usr/bin/env node

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { spawnSync } from "node:child_process";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const safetyCheck = spawnSync(process.execPath, ["scripts/check-migrations-safe.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (safetyCheck.status !== 0) process.exit(safetyCheck.status ?? 1);

function readPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: readPositiveIntEnv("PG_POOL_MAX", 10),
  connectionTimeoutMillis: readPositiveIntEnv("PG_CONNECTION_TIMEOUT_MS", 5000),
  idleTimeoutMillis: readPositiveIntEnv("PG_IDLE_TIMEOUT_MS", 30_000),
  statement_timeout: readPositiveIntEnv("PG_STATEMENT_TIMEOUT_MS", 15_000),
  query_timeout: readPositiveIntEnv("PG_QUERY_TIMEOUT_MS", 20_000),
});

try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database migrations completed");
} finally {
  await pool.end();
}
