import { createError } from "h3";
import { normalizeClientErrorPayload } from "@shared/client-error";
import { requireSession } from "../../utils/auth-session";
import { getRequestDurationMs, getRequestId, getRequestSummary } from "../../utils/log-context";
import { logError } from "../../utils/logger";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const payload = normalizeClientErrorPayload(await readBody(event));
  if (!payload) throw createError({ statusCode: 400, statusMessage: "Invalid client error payload" });

  const error = new Error(payload.message);
  error.name = payload.name || "ClientError";
  if (payload.stack) error.stack = payload.stack;

  logError("client.unhandled_error", {
    error,
    source: "client",
    userId: session.user.id,
    requestId: getRequestId(event),
    route: payload.route || event.path,
    method: event.method,
    statusCode: 500,
    durationMs: getRequestDurationMs(event),
    operation: "client.error",
    appVersion: payload.appVersion,
    request: getRequestSummary(event),
    metadata: {
      context: {
        route: payload.route,
        userAgent: payload.userAgent,
        componentInfo: payload.componentInfo,
      },
    },
  });

  return { ok: true };
});
