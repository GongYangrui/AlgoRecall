import { createError, getHeader, setResponseHeader, type H3Event } from "h3";
import { getRedis } from "./redis";

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
  return getHeader(event, "x-real-ip") || event.node.req.socket.remoteAddress || "unknown";
}

function cleanup(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

async function assertRedisRateLimit(event: H3Event, options: RateLimitOptions) {
  const redis = getRedis();
  if (!redis) return false;

  if (redis.status === "wait") await redis.connect();
  const key = `rate:${options.bucket}:${options.key ?? clientKey(event)}`;
  const ttlSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttlSeconds);
  if (count <= options.limit) return true;

  const retryAfter = Math.max(1, await redis.ttl(key));
  setResponseHeader(event, "Retry-After", retryAfter);
  throw createError({
    statusCode: 429,
    statusMessage: "Too many requests",
    data: { code: "RATE_LIMITED", retryAfterSeconds: retryAfter },
  });
}

function assertMemoryRateLimit(event: H3Event, options: RateLimitOptions) {
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

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  setResponseHeader(event, "Retry-After", retryAfterSeconds);
  throw createError({
    statusCode: 429,
    statusMessage: "Too many requests",
    data: { code: "RATE_LIMITED", retryAfterSeconds },
  });
}

export async function assertRateLimit(event: H3Event, options: RateLimitOptions) {
  const usedRedis = await assertRedisRateLimit(event, options);
  if (!usedRedis) assertMemoryRateLimit(event, options);
}
