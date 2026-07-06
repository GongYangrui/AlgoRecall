#!/usr/bin/env node
import { Client } from "pg";

const daysArg = process.argv[2];
const days = daysArg ? Number(daysArg) : 30;

if (isNaN(days) || days < 1) {
  console.error("Usage: node scripts/cleanup-app-events.mjs [days] (default: 30)");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const result = await client.query(
    `DELETE FROM app_events WHERE timestamp < now() - interval '$1 days' RETURNING id`,
    [String(days)],
  );
  console.log(`Deleted ${result.rowCount} app_events older than ${days} days`);
} catch (error) {
  console.error("Failed to cleanup app_events:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
