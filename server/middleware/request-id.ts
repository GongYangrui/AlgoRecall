import { getHeader, setHeader } from "h3";
import { randomUUID } from "node:crypto";

export default defineEventHandler((event) => {
  const existing = getHeader(event, "x-request-id");
  const reqId = existing || randomUUID();
  (event.context as Record<string, unknown>).requestId = reqId;
  (event.context as Record<string, unknown>).startedAt = Date.now();
  setHeader(event, "x-request-id", reqId);
});
