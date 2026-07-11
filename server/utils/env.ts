import { hasRedisUrl } from "./redis";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

export function assertProductionConfig() {
  if (!isProduction()) return;

  const secret = requireEnv("BETTER_AUTH_SECRET");
  if (secret === "your-secret-key-change-in-production" || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be a real secret with at least 32 characters in production");
  }

  const authUrl = requireEnv("BETTER_AUTH_URL");
  if (!authUrl.startsWith("https://")) {
    throw new Error("BETTER_AUTH_URL must use https:// in production");
  }

  if (!hasRedisUrl()) {
    throw new Error("REDIS_URL is required in production for distributed rate limiting and auth secondary storage");
  }

}

export function trustedOrigins() {
  return (process.env.TRUSTED_ORIGINS || process.env.BETTER_AUTH_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
