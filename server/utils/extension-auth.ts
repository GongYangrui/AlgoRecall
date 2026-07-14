import { and, eq, gt, isNull } from "drizzle-orm";
import { createError, getHeader, type H3Event } from "h3";
import { EXTENSION_TOKEN_PREFIX } from "@shared/extension";
import { db } from "../db";
import { extensionConnections } from "../db/schema";
import { assertRateLimit } from "./rate-limit";
import { nowIso } from "./time";
import { hashExtensionSecret } from "./extension-credentials";

function extensionAuthError() {
  return createError({
    statusCode: 401,
    statusMessage: "Extension authentication required",
    data: { code: "EXTENSION_AUTH_REQUIRED" },
  });
}

export async function requireExtensionToken(event: H3Event) {
  const authorization = getHeader(event, "authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token.startsWith(EXTENSION_TOKEN_PREFIX)) throw extensionAuthError();

  const tokenHash = hashExtensionSecret(token);
  const now = nowIso();
  const [connection] = await db
    .select()
    .from(extensionConnections)
    .where(and(
      eq(extensionConnections.tokenHash, tokenHash),
      isNull(extensionConnections.revokedAt),
      gt(extensionConnections.expiresAt, now),
    ))
    .limit(1);

  if (!connection) throw extensionAuthError();
  await assertRateLimit(event, { bucket: "extension.api", key: connection.id, limit: 180, windowMs: 60_000 });

  const lastUsed = connection.lastUsedAt ? Date.parse(connection.lastUsedAt) : 0;
  if (Date.now() - lastUsed > 60_000) {
    await db.update(extensionConnections).set({ lastUsedAt: now, updatedAt: now }).where(eq(extensionConnections.id, connection.id));
  }
  (event.context as Record<string, unknown>).extensionConnectionId = connection.id;
  return connection;
}
