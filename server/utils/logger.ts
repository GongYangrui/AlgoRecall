import { db } from "../db";
import { appEvents } from "../db/schema";
import type { NewAppEventRow } from "../db/schema";
import { randomUUID } from "node:crypto";
import { buildLogEntry, type LogEntryData } from "@shared/logging";

export function getAppVersion() {
  return process.env.APP_VERSION || process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || "dev";
}

export function getLogEnvironment() {
  return process.env.NODE_ENV || "development";
}

async function writeToDb(entry: ReturnType<typeof buildLogEntry>) {
  const values: NewAppEventRow = {
    id: randomUUID(),
    timestamp: entry.timestamp,
    level: entry.level,
    source: entry.source,
    event: entry.event,
    message: entry.message,
    errorName: entry.errorName || null,
    errorStack: entry.errorStack || null,
    errorCause: entry.errorCause || null,
    requestId: entry.requestId || null,
    userId: entry.userId || null,
    method: entry.method || null,
    route: entry.route || null,
    statusCode: entry.statusCode ?? null,
    durationMs: entry.durationMs ?? null,
    appVersion: entry.appVersion,
    environment: entry.environment,
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
  data: LogEntryData = {},
) {
  const entry = buildLogEntry("error", eventName, data, { appVersion: getAppVersion(), environment: getLogEnvironment() });
  const json = JSON.stringify(entry);
  console.error(json);

  writeToDb(entry).catch((err) => {
    console.error("failed_to_write_app_event", err);
  });
}

export function logWarn(
  eventName: string,
  data: LogEntryData = {},
) {
  const entry = buildLogEntry("warn", eventName, data, { appVersion: getAppVersion(), environment: getLogEnvironment() });
  const json = JSON.stringify(entry);
  console.warn(json);

  writeToDb(entry).catch((err) => {
    console.error("failed_to_write_app_event", err);
  });
}

export function logInfo(
  eventName: string,
  data: LogEntryData = {},
) {
  const entry = buildLogEntry("info", eventName, data, { appVersion: getAppVersion(), environment: getLogEnvironment() });
  const json = JSON.stringify(entry);
  console.info(json);
}

export function logPerformance(
  eventName: string,
  data: LogEntryData = {},
) {
  const entry = buildLogEntry("info", eventName, data, { appVersion: getAppVersion(), environment: getLogEnvironment() });
  const json = JSON.stringify(entry);
  console.info(json);

  writeToDb(entry).catch((err) => {
    console.error("failed_to_write_app_event", err);
  });
}

export function logAudit(
  eventName: string,
  data: LogEntryData & { message: string },
) {
  const entry = buildLogEntry("audit", eventName, data, { appVersion: getAppVersion(), environment: getLogEnvironment() });
  const json = JSON.stringify(entry);
  console.info(json);

  writeToDb(entry).catch((err) => {
    console.error("failed_to_write_app_event", err);
  });
}
