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

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + " " + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":");
}

try {
  await client.connect();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const appEventsResult = await client.query(
    "DELETE FROM app_events WHERE timestamp < $1 RETURNING id",
    [cutoff.toISOString()],
  );
  const analyticsEventsResult = await client.query(
    "DELETE FROM analytics_events WHERE timestamp < $1 RETURNING id",
    [formatLocalDateTime(cutoff)],
  );
  console.log(`Deleted ${appEventsResult.rowCount} app_events older than ${days} days`);
  console.log(`Deleted ${analyticsEventsResult.rowCount} analytics_events older than ${days} days`);
} catch (error) {
  console.error("Failed to cleanup events:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
