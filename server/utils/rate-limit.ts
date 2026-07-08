import { createError, getHeader, getRequestIP, type H3Event } from "h3";

type RateLimitOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
  key?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function clientKey(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || getHeader(event, "x-real-ip") || "unknown";
}

function cleanup(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export function assertRateLimit(event: H3Event, options: RateLimitOptions) {
  const now = Date.now();
  cleanup(now);

  const key = `${options.bucket}:${options.key ?? clientKey(event)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  current.count += 1;
  if (current.count <= options.limit) return;

  throw createError({
    statusCode: 429,
    statusMessage: "Too many requests",
    data: {
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    },
  });
}
