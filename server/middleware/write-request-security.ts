import { createError, getHeader, getRequestURL, type H3Event } from "h3";
import { trustedOrigins } from "../utils/env";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 1024 * 1024;

function reject(statusCode: number, statusMessage: string, code: string) {
  throw createError({ statusCode, statusMessage, data: { code } });
}

export default defineEventHandler((event: H3Event) => {
  if (!WRITE_METHODS.has(event.method) || !getRequestURL(event).pathname.startsWith("/api/")) return;
  if (getRequestURL(event).pathname.startsWith("/api/auth/")) return;

  const contentLength = Number(getHeader(event, "content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    reject(413, "Request body too large", "PAYLOAD_TOO_LARGE");
  }

  const contentType = getHeader(event, "content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    reject(415, "application/json is required", "UNSUPPORTED_MEDIA_TYPE");
  }

  const fetchSite = getHeader(event, "sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") reject(403, "Cross-site request rejected", "CROSS_SITE_REQUEST");

  const origin = getHeader(event, "origin");
  if (origin && !trustedOrigins().includes(origin)) {
    reject(403, "Origin is not trusted", "UNTRUSTED_ORIGIN");
  }
  if (process.env.NODE_ENV === "production" && !origin && !fetchSite) {
    reject(403, "Origin metadata is required", "MISSING_ORIGIN");
  }
});
