import { desc, eq } from "drizzle-orm";
import type { ExtensionConnection } from "@shared/extension";
import { db } from "../../../db";
import { extensionConnections } from "../../../db/schema";
import { requireSession } from "../../../utils/auth-session";

export default defineEventHandler(async (event): Promise<{ connections: ExtensionConnection[] }> => {
  const session = await requireSession(event);
  const rows = await db
    .select({
      id: extensionConnections.id,
      deviceName: extensionConnections.deviceName,
      createdAt: extensionConnections.createdAt,
      lastUsedAt: extensionConnections.lastUsedAt,
      expiresAt: extensionConnections.expiresAt,
      revokedAt: extensionConnections.revokedAt,
    })
    .from(extensionConnections)
    .where(eq(extensionConnections.userId, session.user.id))
    .orderBy(desc(extensionConnections.createdAt));
  return { connections: rows };
});
