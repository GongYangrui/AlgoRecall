import { db } from "../../db";
import { requireAdminSession } from "../../utils/admin-session";
import type { AdminLogEntry } from "@shared/types/admin";

export default defineEventHandler(async (event): Promise<{ items: AdminLogEntry[]; total: number; page: number; pageSize: number }> => {
  await requireAdminSession(event);

  const query = getQuery(event);
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));

  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const level = typeof query.level === "string" ? query.level.trim() : "";
  const eventFilter = typeof query.event === "string" ? query.event.trim() : "";
  const routeFilter = typeof query.route === "string" ? query.route.trim() : "";
  const statusCode = typeof query.statusCode === "string" ? query.statusCode.trim() : "";
  const requestId = typeof query.requestId === "string" ? query.requestId.trim() : "";
  const from = typeof query.from === "string" ? query.from.trim() : "";
  const to = typeof query.to === "string" ? query.to.trim() : "";

  const whereParts: string[] = [];

  if (q) {
    const escaped = q.replace(/'/g, "''");
    whereParts.push(`(event ILIKE '%${escaped}%' OR message ILIKE '%${escaped}%' OR route ILIKE '%${escaped}%')`);
  }
  if (level) whereParts.push(`level = '${level.replace(/'/g, "''")}'`);
  if (eventFilter) { const e = eventFilter.replace(/'/g, "''"); whereParts.push(`event ILIKE '%${e}%'`); }
  if (routeFilter) { const r = routeFilter.replace(/'/g, "''"); whereParts.push(`route ILIKE '%${r}%'`); }
  if (statusCode) whereParts.push(`status_code = ${Number(statusCode)}`);
  if (requestId) { const r = requestId.replace(/'/g, "''"); whereParts.push(`request_id = '${r}'`); }
  if (from) { const f = from.replace(/'/g, "''"); whereParts.push(`timestamp >= '${f}'`); }
  if (to) { const t = to.replace(/'/g, "''"); whereParts.push(`timestamp <= '${t}'`); }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const totalResult = await db.execute(`SELECT count(*) as count FROM app_events ${whereSql}`);
  const dataRows = await db.execute(`SELECT * FROM app_events ${whereSql} ORDER BY timestamp DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);

  const items: AdminLogEntry[] = dataRows.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      timestamp: String(r.timestamp),
      level: r.level as AdminLogEntry["level"],
      event: String(r.event),
      message: String(r.message),
      errorName: r.error_name ? String(r.error_name) : undefined,
      errorStack: r.error_stack ? String(r.error_stack) : undefined,
      errorCause: r.error_cause ? String(r.error_cause) : undefined,
      requestId: r.request_id ? String(r.request_id) : undefined,
      userId: r.user_id ? String(r.user_id) : undefined,
      method: r.method ? String(r.method) : undefined,
      route: r.route ? String(r.route) : undefined,
      statusCode: r.status_code ? Number(r.status_code) : undefined,
      durationMs: r.duration_ms ? Number(r.duration_ms) : undefined,
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined,
    };
  });

  return {
    items,
    total: Number((totalResult.rows[0] as Record<string, unknown> | undefined)?.count ?? 0),
    page,
    pageSize,
  };
});
