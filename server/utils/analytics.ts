import { randomUUID } from "node:crypto";
import { db } from "../db";
import { analyticsEvents } from "../db/schema";
import type { NewAnalyticsEventRow } from "../db/schema";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "cookie",
  "secret",
  "authorization",
  "access_token",
  "refresh_token",
  "id_token",
]);

function sanitize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "***";
    } else {
      result[key] = sanitize(val);
    }
  }
  return result;
}

export function analyticsTimestamp(date = new Date()) {
  return date.toISOString();
}

export async function trackAnalyticsEvent(data: {
  userId: string;
  event: string;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const row: NewAnalyticsEventRow = {
    id: randomUUID(),
    timestamp: analyticsTimestamp(),
    userId: data.userId,
    event: data.event,
    entityType: data.entityType ?? null,
    entityId: data.entityId ?? null,
    route: data.route ?? null,
    metadata: JSON.stringify(data.metadata ? sanitize(data.metadata) : {}),
  };

  try {
    await db.insert(analyticsEvents).values(row);
  } catch (error) {
    console.error("failed_to_write_analytics_event", error);
  }
}
