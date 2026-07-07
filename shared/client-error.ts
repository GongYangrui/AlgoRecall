import { truncateLogString } from "./logging";

export interface ClientErrorPayload {
  message: string;
  name?: string;
  stack?: string;
  route?: string;
  userAgent?: string;
  componentInfo?: string;
  appVersion?: string;
}

export function normalizeClientErrorPayload(input: unknown): ClientErrorPayload | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  if (!message) return null;

  return {
    message: truncateLogString(message, 1000),
    name: typeof raw.name === "string" ? truncateLogString(raw.name, 120) : undefined,
    stack: typeof raw.stack === "string" ? truncateLogString(raw.stack, 12000) : undefined,
    route: typeof raw.route === "string" ? truncateLogString(raw.route, 500) : undefined,
    userAgent: typeof raw.userAgent === "string" ? truncateLogString(raw.userAgent, 500) : undefined,
    componentInfo: typeof raw.componentInfo === "string" ? truncateLogString(raw.componentInfo, 1000) : undefined,
    appVersion: typeof raw.appVersion === "string" ? truncateLogString(raw.appVersion, 200) : undefined,
  };
}
