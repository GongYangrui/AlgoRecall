export const adminLogLevels = ["error", "warn", "info", "audit"] as const;
export type AdminLogLevel = (typeof adminLogLevels)[number];

export function isAdminLogLevel(value: string): value is AdminLogLevel {
  return (adminLogLevels as readonly string[]).includes(value);
}

export function normalizeAdminLogDateTime(value: string, name: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${name}`);
  }
  return parsed.toISOString();
}

export function parseAdminLogStatusCode(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) {
    throw new Error("Invalid statusCode");
  }
  return parsed;
}
