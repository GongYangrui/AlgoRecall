import { and, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { createError } from "h3";
import { isAdminLogLevel, normalizeAdminLogDateTime, parseAdminLogStatusCode } from "@shared/admin-log-filters";
import { isLogSource } from "@shared/logging";
import { db } from "../../db";
import { appEvents } from "../../db/schema";
import { requireAdminSession } from "../../utils/admin-session";
import { setLogOperation } from "../../utils/log-context";
import type { AdminLogEntry } from "@shared/types/admin";

const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_PAGE = 1000;

function parseMetadata(value: string | null): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

export default defineEventHandler(async (event): Promise<{ items: AdminLogEntry[]; total: number; page: number; pageSize: number }> => {
  await requireAdminSession(event);
  setLogOperation(event, "admin.logs.query");

  const query = getQuery(event);
  const page = Math.min(MAX_PAGE, Math.max(1, Number(query.page || 1)));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));

  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const level = typeof query.level === "string" ? query.level.trim() : "";
  const eventFilter = typeof query.event === "string" ? query.event.trim() : "";
  const routeFilter = typeof query.route === "string" ? query.route.trim() : "";
  const statusCode = typeof query.statusCode === "string" ? query.statusCode.trim() : "";
  const requestId = typeof query.requestId === "string" ? query.requestId.trim() : "";
  const source = typeof query.source === "string" ? query.source.trim() : "";
  const appVersion = typeof query.appVersion === "string" ? query.appVersion.trim().slice(0, 100) : "";

  if (level && !isAdminLogLevel(level)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid level" });
  }
  if (source && !isLogSource(source)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid source" });
  }

  let parsedStatusCode: number | null;
  let from: string;
  let to: string;
  try {
    parsedStatusCode = parseAdminLogStatusCode(statusCode);
    const rawFrom = typeof query.from === "string" ? query.from.trim() : "";
    from = rawFrom || new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
    if (rawFrom) from = normalizeAdminLogDateTime(rawFrom, "from");
    to = normalizeAdminLogDateTime(typeof query.to === "string" ? query.to.trim() : "", "to");
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : "Invalid log filter" });
  }

  const conditions: SQL[] = [];

  if (q) {
    conditions.push(or(
      ilike(appEvents.event, `%${q}%`),
      ilike(appEvents.message, `%${q}%`),
      ilike(appEvents.route, `%${q}%`),
    )!);
  }
  if (level) conditions.push(eq(appEvents.level, level));
  if (source) conditions.push(eq(appEvents.source, source));
  if (appVersion) conditions.push(eq(appEvents.appVersion, appVersion));
  if (eventFilter) conditions.push(ilike(appEvents.event, `%${eventFilter}%`));
  if (routeFilter) conditions.push(ilike(appEvents.route, `%${routeFilter}%`));
  if (parsedStatusCode) conditions.push(eq(appEvents.statusCode, parsedStatusCode));
  if (requestId) conditions.push(eq(appEvents.requestId, requestId));
  if (from) conditions.push(gte(appEvents.timestamp, from));
  if (to) conditions.push(lte(appEvents.timestamp, to));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalResult] = await db.select({ count: count() }).from(appEvents).where(whereClause);
  const rows = await db
    .select()
    .from(appEvents)
    .where(whereClause)
    .orderBy(desc(appEvents.timestamp))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items: AdminLogEntry[] = rows.map((row) => {
    return {
      id: row.id,
      timestamp: row.timestamp,
      level: row.level as AdminLogEntry["level"],
      source: row.source as AdminLogEntry["source"],
      event: row.event,
      message: row.message,
      errorName: row.errorName ?? undefined,
      errorStack: row.errorStack ?? undefined,
      errorCause: row.errorCause ?? undefined,
      requestId: row.requestId ?? undefined,
      userId: row.userId ?? undefined,
      method: row.method ?? undefined,
      route: row.route ?? undefined,
      statusCode: row.statusCode ?? undefined,
      durationMs: row.durationMs ?? undefined,
      appVersion: row.appVersion,
      environment: row.environment,
      metadata: parseMetadata(row.metadata ?? null),
    };
  });

  return {
    items,
    total: Number(totalResult?.count ?? 0),
    page,
    pageSize,
  };
});
