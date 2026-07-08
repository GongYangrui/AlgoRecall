import { performance as nodePerformance } from "node:perf_hooks";
import {
  getApiSlowRequestThresholdMs,
  logApiRequestPerformance,
  normalizePerformanceRoute,
  shouldLogApiRequestPerformance,
} from "../utils/performance";

export default defineEventHandler((event) => {
  const path = event.path || event.node.req.url || "";
  if (!path.startsWith("/api/")) return;

  const startedAt = nodePerformance.now();

  event.node.res.once("finish", () => {
    const durationMs = Math.max(0, Math.round(nodePerformance.now() - startedAt));
    const statusCode = event.node.res.statusCode;
    const thresholdMs = getApiSlowRequestThresholdMs();
    const route = normalizePerformanceRoute(path);

    if (!shouldLogApiRequestPerformance({ path, statusCode, durationMs, thresholdMs })) return;

    logApiRequestPerformance(event, {
      route,
      statusCode,
      durationMs,
      thresholdMs,
    });
  });
});
