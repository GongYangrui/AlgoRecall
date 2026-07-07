import { logError, logWarn } from "../utils/logger";
import {
  getErrorStatusCode,
  getEventRoute,
  getEventUserId,
  getLogContext,
  getLogOperation,
  getRequestDurationMs,
  getRequestId,
  getRequestSummary,
} from "../utils/log-context";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error: unknown, { event }: { event: unknown }) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const ev = event as Parameters<typeof getRequestSummary>[0] | undefined;
    if (!ev) return;

    const statusCode = getErrorStatusCode(error, ev);
    if (statusCode < 500 && statusCode !== 409) return;

    const logger = statusCode === 409 ? logWarn : logError;
    logger(statusCode === 409 ? "server.conflict" : "server.unhandled_error", {
      message: err.message,
      error: err,
      requestId: getRequestId(ev),
      userId: getEventUserId(ev),
      route: getEventRoute(ev),
      method: ev.method,
      statusCode,
      durationMs: getRequestDurationMs(ev),
      source: "server",
      operation: getLogOperation(ev),
      request: getRequestSummary(ev),
      metadata: getLogContext(ev) ? { context: getLogContext(ev) } : undefined,
    });
  });
});
