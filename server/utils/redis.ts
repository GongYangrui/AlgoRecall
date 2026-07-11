import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  _algorecallRedis?: Redis;
};

export function hasRedisUrl() {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getRedis() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return null;

  if (!globalForRedis._algorecallRedis) {
    globalForRedis._algorecallRedis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  }

  return globalForRedis._algorecallRedis;
}

export async function redisPing() {
  const redis = getRedis();
  if (!redis) return false;
  if (redis.status === "wait") await redis.connect();
  return (await redis.ping()) === "PONG";
}

export function redisSecondaryStorage() {
  const redis = getRedis();
  if (!redis) return undefined;

  return {
    get: async (key: string) => redis.get(key),
    set: async (key: string, value: string, ttl?: number) => {
      if (ttl && ttl > 0) {
        await redis.set(key, value, "EX", ttl);
        return;
      }
      await redis.set(key, value);
    },
    delete: async (key: string) => {
      await redis.del(key);
    },
    getAndDelete: async (key: string) => {
      const pipeline = redis.multi();
      pipeline.get(key);
      pipeline.del(key);
      const result = await pipeline.exec();
      return result?.[0]?.[1] ?? null;
    },
    increment: async (key: string, ttl: number) => {
      const count = await redis.incr(key);
      if (count === 1 && ttl > 0) await redis.expire(key, ttl);
      return count;
    },
  };
}
