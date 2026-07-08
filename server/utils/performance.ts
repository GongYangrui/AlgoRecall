import { performance as nodePerformance } from "node:perf_hooks";
import { setHeader, type H3Event } from "h3";
import { logPerformance } from "./logger";
import { getEventUserId, getRequestId } from "./log-context";

export type PerformanceStageKind = "auth" | "db" | "io_cpu" | "app";
export const DEFAULT_API_SLOW_REQUEST_THRESHOLD_MS = 100;

export interface PerformanceStage {
  name: string;
  durationMs: number;
  kind: PerformanceStageKind;
}

function elapsedMs(startedAt: number) {
  return Math.max(0, Math.round(nodePerformance.now() - startedAt));
}

function metricName(name: string) {
  const sanitized = name.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 50);
  return sanitized || "stage";
}

export class RequestPerformanceTimer {
  private readonly startedAt = nodePerformance.now();
  private readonly stages: PerformanceStage[] = [];

  async measure<T>(name: string, kind: PerformanceStageKind, fn: () => T | Promise<T>): Promise<T> {
    const stageStartedAt = nodePerformance.now();
    try {
      return await fn();
    } finally {
      this.stages.push({
        name,
        kind,
        durationMs: elapsedMs(stageStartedAt),
      });
    }
  }

  totalMs() {
    return elapsedMs(this.startedAt);
  }

  snapshot() {
    return {
      totalMs: this.totalMs(),
      stages: this.stages.map((stage) => ({ ...stage })),
    };
  }

  serverTimingHeader() {
    const metrics = this.stages.map((stage) => `${metricName(stage.name)};dur=${stage.durationMs}`);
    metrics.push(`total;dur=${this.totalMs()}`);
    return metrics.join(", ");
  }
}

export function createPerformanceTimer() {
  return new RequestPerformanceTimer();
}

export async function measurePerformanceStage<T>(
  timer: RequestPerformanceTimer | undefined,
  name: string,
  kind: PerformanceStageKind,
  fn: () => T | Promise<T>,
): Promise<T> {
  return timer ? timer.measure(name, kind, fn) : await fn();
}

export function setServerTimingHeader(event: H3Event, timer: RequestPerformanceTimer) {
  setHeader(event, "Server-Timing", timer.serverTimingHeader());
}

export function logRequestPerformance(event: H3Event, options: {
  timer: RequestPerformanceTimer;
  operation: string;
  route: string;
  userId?: string;
  statusCode?: number;
}) {
  const timing = options.timer.snapshot();
  logPerformance("server.performance", {
    message: `${options.operation} completed in ${timing.totalMs}ms`,
    requestId: getRequestId(event),
    userId: options.userId,
    method: event.method,
    route: options.route,
    statusCode: options.statusCode,
    durationMs: timing.totalMs,
    source: "server",
    operation: options.operation,
    metadata: { timing },
  });
}

export function getApiSlowRequestThresholdMs(env: Record<string, string | undefined> = process.env) {
  const parsed = Number(env.API_SLOW_REQUEST_THRESHOLD_MS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_API_SLOW_REQUEST_THRESHOLD_MS;
}

export function normalizePerformanceRoute(value: string) {
  return value.split("?")[0] || "/";
}

export function shouldLogApiRequestPerformance(input: {
  path: string;
  statusCode: number;
  durationMs: number;
  thresholdMs?: number;
}) {
  if (!input.path.startsWith("/api/")) return false;
  if (input.statusCode >= 500) return true;

  const isSuccessful = input.statusCode >= 200 && input.statusCode < 400;
  return isSuccessful && input.durationMs >= (input.thresholdMs ?? DEFAULT_API_SLOW_REQUEST_THRESHOLD_MS);
}

export function logApiRequestPerformance(event: H3Event, options: {
  route: string;
  statusCode: number;
  durationMs: number;
  thresholdMs: number;
}) {
  const reason = options.statusCode >= 500 ? "server_error" : "slow_request";
  logPerformance("server.request_slow", {
    message: `${event.method} ${options.route} completed in ${options.durationMs}ms`,
    requestId: getRequestId(event),
    userId: getEventUserId(event),
    method: event.method,
    route: options.route,
    statusCode: options.statusCode,
    durationMs: options.durationMs,
    source: "server",
    operation: "server.request",
    metadata: {
      performance: {
        thresholdMs: options.thresholdMs,
        reason,
      },
    },
  });
}
