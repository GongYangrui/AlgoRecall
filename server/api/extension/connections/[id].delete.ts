import { and, eq } from "drizzle-orm";
import { createError, getRouterParam } from "h3";
import { db } from "../../../db";
import { extensionConnections } from "../../../db/schema";
import { requireSession } from "../../../utils/auth-session";
import { setLogOperation } from "../../../utils/log-context";
import { assertRateLimit } from "../../../utils/rate-limit";
import { nowIso } from "../../../utils/time";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  await assertRateLimit(event, { bucket: "extension.connection.revoke", key: session.user.id, limit: 30, windowMs: 60_000 });
  const id = getRouterParam(event, "id") || "";
  if (!id) throw createError({ statusCode: 400, statusMessage: "Connection id is required" });
  const now = nowIso();
  const [connection] = await db
    .update(extensionConnections)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(eq(extensionConnections.id, id), eq(extensionConnections.userId, session.user.id)))
    .returning({ id: extensionConnections.id });
  if (!connection) throw createError({ statusCode: 404, statusMessage: "Connection not found" });
  setLogOperation(event, "extension.connection.revoke", { connectionId: id });
  return { ok: true };
});
