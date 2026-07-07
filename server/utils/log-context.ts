import { getHeader, getQuery, type H3Event } from "h3";
import type { LogRequestSummary } from "@shared/logging";

export function getRequestId(event: H3Event) {
  return (event.context as Record<string, unknown>).requestId as string | undefined;
}

export function getRequestDurationMs(event: H3Event) {
  const startedAt = (event.context as Record<string, unknown>).startedAt as number | undefined;
  return startedAt ? Math.max(0, Date.now() - startedAt) : undefined;
}

export function getEventUserId(event: H3Event) {
  const session = (event.context as Record<string, unknown>).authSession as { user?: { id?: string } } | undefined;
  return session?.user?.id;
}

export function setLogOperation(event: H3Event, operation: string, context?: Record<string, unknown>) {
  (event.context as Record<string, unknown>).logOperation = operation;
  if (context) (event.context as Record<string, unknown>).logContext = context;
}

export function getLogOperation(event: H3Event) {
  return ((event.context as Record<string, unknown>).logOperation as string | undefined) || "server.request";
}

export function getLogContext(event: H3Event) {
  return (event.context as Record<string, unknown>).logContext as Record<string, unknown> | undefined;
}

export function getEventRoute(event: H3Event) {
  return event.path || event.node.req.url || "";
}

export function getRequestSummary(event: H3Event): LogRequestSummary {
  const forwardedFor = getHeader(event, "x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || getHeader(event, "x-real-ip") || event.node.req.socket.remoteAddress || null;

  return {
    path: event.path || event.node.req.url || "",
    query: getQuery(event) as Record<string, unknown>,
    params: event.context.params as Record<string, unknown> | undefined,
    userAgent: getHeader(event, "user-agent") || null,
    ip,
    referrer: getHeader(event, "referer") || getHeader(event, "referrer") || null,
    contentType: getHeader(event, "content-type") || null,
  };
}

export function getErrorStatusCode(error: unknown, event: H3Event) {
  const candidate = error as { statusCode?: unknown; status?: unknown };
  const statusCode = Number(candidate?.statusCode ?? candidate?.status ?? event.node.res.statusCode);
  return Number.isInteger(statusCode) && statusCode > 0 ? statusCode : 500;
}
