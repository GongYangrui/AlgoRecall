import { db } from "../db";
import { appEvents } from "../db/schema";
import type { NewAppEventRow } from "../db/schema";
import { randomUUID } from "node:crypto";

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
    } else if (typeof val === "object" && val !== null) {
      result[key] = sanitize(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function extractError(error: unknown): {
  errorName: string | undefined;
  errorStack: string | undefined;
  errorCause: string | undefined;
  message: string;
} {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorStack: error.stack,
      errorCause: error.cause instanceof Error ? error.cause.message : String(error.cause ?? ""),
      message: error.message,
    };
  }
  const msg = String(error);
  return {
    errorName: undefined,
    errorStack: undefined,
    errorCause: undefined,
    message: msg,
  };
}

function buildLogEntry(
  level: string,
  event: string,
  data: {
    message?: string;
    error?: unknown;
    requestId?: string;
    userId?: string;
    route?: string;
    statusCode?: number;
    durationMs?: number;
    method?: string;
    metadata?: Record<string, unknown>;
  },
): Record<string, unknown> {
  const errInfo = data.error ? extractError(data.error) : { errorName: undefined, errorStack: undefined, errorCause: undefined, message: data.message ?? "" };

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message: errInfo.message,
    errorName: errInfo.errorName,
    errorStack: errInfo.errorStack,
    errorCause: errInfo.errorCause || undefined,
    requestId: data.requestId,
    userId: data.userId,
    method: data.method,
    route: data.route,
    statusCode: data.statusCode,
    durationMs: data.durationMs,
    metadata: data.metadata ? sanitize(data.metadata) : undefined,
  };

  // Remove undefined fields for cleaner JSON
  for (const key of Object.keys(entry)) {
    if (entry[key] === undefined) delete entry[key];
  }

  return entry;
}

async function writeToDb(entry: Record<string, unknown>) {
  const values: NewAppEventRow = {
    id: randomUUID(),
    timestamp: entry.timestamp as string,
    level: entry.level as string,
    event: entry.event as string,
    message: entry.message as string,
    errorName: (entry.errorName as string) || null,
    errorStack: (entry.errorStack as string) || null,
    errorCause: (entry.errorCause as string) || null,
    requestId: (entry.requestId as string) || null,
    userId: (entry.userId as string) || null,
    method: (entry.method as string) || null,
    route: (entry.route as string) || null,
    statusCode: entry.statusCode as number | null,
    durationMs: entry.durationMs as number | null,
    metadata: JSON.stringify(entry.metadata || {}),
  };

  try {
    await db.insert(appEvents).values(values);
  } catch (logDbError) {
    console.error("failed_to_write_app_event", logDbError);
  }
}

export function logError(
  eventName: string,
  data: {
    message?: string;
    error?: unknown;
    requestId?: string;
    userId?: string;
    route?: string;
    statusCode?: number;
    durationMs?: number;
    method?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const entry = buildLogEntry("error", eventName, data);
  const json = JSON.stringify(entry);
  console.error(json);

  writeToDb(entry).catch((err) => {
    console.error("failed_to_write_app_event", err);
  });
}

export function logWarn(
  eventName: string,
  data: {
    message?: string;
    requestId?: string;
    userId?: string;
    route?: string;
    statusCode?: number;
    durationMs?: number;
    method?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const entry = buildLogEntry("warn", eventName, data);
  const json = JSON.stringify(entry);
  console.warn(json);
}

export function logInfo(
  eventName: string,
  data: {
    message?: string;
    requestId?: string;
    userId?: string;
    route?: string;
    statusCode?: number;
    durationMs?: number;
    method?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const entry = buildLogEntry("info", eventName, data);
  const json = JSON.stringify(entry);
  console.info(json);
}

export function logAudit(
  eventName: string,
  data: {
    message: string;
    userId?: string;
    requestId?: string;
    route?: string;
    method?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const entry = buildLogEntry("audit", eventName, data);
  const json = JSON.stringify(entry);
  console.info(json);

  writeToDb(entry).catch((err) => {
    console.error("failed_to_write_app_event", err);
  });
}
