export const logSources = ["server", "client", "system"] as const;
export type LogSource = (typeof logSources)[number];

export function isLogSource(value: string): value is LogSource {
  return (logSources as readonly string[]).includes(value);
}

export const logLevels = ["error", "warn", "info", "audit"] as const;
export type LogLevel = (typeof logLevels)[number];

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

const MAX_STRING_LENGTH = 4000;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 6;

export interface LogRequestSummary {
  path?: string;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  userAgent?: string | null;
  ip?: string | null;
  referrer?: string | null;
  contentType?: string | null;
}

export interface LogEntryData {
  message?: string;
  error?: unknown;
  errorName?: string;
  errorStack?: string;
  errorCause?: string;
  requestId?: string;
  userId?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  method?: string;
  source?: LogSource;
  appVersion?: string;
  environment?: string;
  operation?: string;
  request?: LogRequestSummary;
  metadata?: Record<string, unknown>;
}

export interface BuiltLogEntry {
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  event: string;
  message: string;
  appVersion: string;
  environment: string;
  errorName?: string;
  errorStack?: string;
  errorCause?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export function truncateLogString(value: string, maxLength = MAX_STRING_LENGTH) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncateLogString(value);
  if (typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[Max depth reached]";

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeLogValue(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "***";
    } else {
      result[key] = sanitizeLogValue(val, depth + 1);
    }
  }
  return result;
}

export function extractErrorInfo(error: unknown): {
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

export function buildLogEntry(
  level: LogLevel,
  event: string,
  data: LogEntryData = {},
  defaults: { appVersion: string; environment: string },
): BuiltLogEntry {
  const errInfo = data.error
    ? extractErrorInfo(data.error)
    : {
        errorName: data.errorName,
        errorStack: data.errorStack,
        errorCause: data.errorCause,
        message: data.message ?? "",
      };

  const metadata = {
    ...(data.metadata ?? {}),
    ...(data.operation ? { operation: data.operation } : {}),
    ...(data.request ? { request: data.request } : {}),
  };

  const entry: BuiltLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    source: data.source ?? "server",
    event,
    message: truncateLogString(errInfo.message || data.message || event),
    errorName: errInfo.errorName,
    errorStack: errInfo.errorStack ? truncateLogString(errInfo.errorStack, 12000) : undefined,
    errorCause: errInfo.errorCause ? truncateLogString(errInfo.errorCause) : undefined,
    requestId: data.requestId,
    userId: data.userId,
    method: data.method,
    route: data.route,
    statusCode: data.statusCode,
    durationMs: data.durationMs,
    appVersion: data.appVersion ?? defaults.appVersion,
    environment: data.environment ?? defaults.environment,
    metadata: Object.keys(metadata).length > 0 ? sanitizeLogValue(metadata) as Record<string, unknown> : undefined,
  };

  for (const key of Object.keys(entry) as (keyof BuiltLogEntry)[]) {
    if (entry[key] === undefined) delete entry[key];
  }

  return entry;
}

export function buildDiagnosticPayload(entry: {
  timestamp: string;
  event: string;
  message: string;
  errorStack?: string;
  route?: string;
  requestId?: string;
  userId?: string;
  statusCode?: number;
  appVersion?: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    timestamp: entry.timestamp,
    event: entry.event,
    message: entry.message,
    stack: entry.errorStack,
    route: entry.route,
    requestId: entry.requestId,
    userId: entry.userId,
    statusCode: entry.statusCode,
    operation: entry.metadata?.operation,
    appVersion: entry.appVersion,
    request: entry.metadata?.request,
  };
}
