import { eq } from "drizzle-orm";
import { createError, getRouterParam } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { EXTENSION_TOKEN_TTL_MS, resolveExtensionPairingClaimStatus, type ExtensionPairingTokenResponse } from "@shared/extension";
import { db } from "../../../../db";
import { extensionConnections, extensionPairings } from "../../../../db/schema";
import { createExtensionToken, hashExtensionSecret } from "../../../../utils/extension-credentials";
import { setLogOperation } from "../../../../utils/log-context";
import { assertRateLimit } from "../../../../utils/rate-limit";
import { nowIso } from "../../../../utils/time";

const inputSchema = z.object({ pairingSecret: z.string().min(20).max(200) });

export default defineEventHandler(async (event): Promise<ExtensionPairingTokenResponse> => {
  const id = getRouterParam(event, "id") || "";
  await assertRateLimit(event, { bucket: "extension.pairing.token", key: id || undefined, limit: 130, windowMs: 10 * 60_000 });
  const parsed = inputSchema.safeParse(await readBody(event));
  if (!id || !parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid pairing request" });

  const result = await db.transaction(async (tx): Promise<ExtensionPairingTokenResponse> => {
    const [pairing] = await tx.select().from(extensionPairings).where(eq(extensionPairings.id, id)).limit(1).for("update");
    if (!pairing || hashExtensionSecret(parsed.data.pairingSecret) !== pairing.secretHash) {
      throw createError({ statusCode: 401, statusMessage: "Invalid pairing secret", data: { code: "INVALID_PAIRING_SECRET" } });
    }
    const status = resolveExtensionPairingClaimStatus(
      pairing.status as "pending" | "approved" | "denied" | "consumed",
      pairing.expiresAt,
    );
    if (status === "expired") return { status: "expired" };
    if (status === "pending") return { status: "pending" };
    if (status === "denied") return { status: "denied" };
    if (status === "consumed") {
      throw createError({ statusCode: 409, statusMessage: "Pairing already consumed", data: { code: "PAIRING_ALREADY_CONSUMED" } });
    }
    if (!pairing.userId) throw createError({ statusCode: 409, statusMessage: "Pairing has no user" });

    const token = createExtensionToken();
    const connectionId = uuidv4();
    const now = nowIso();
    const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_TTL_MS).toISOString();
    await tx.insert(extensionConnections).values({
      id: connectionId,
      userId: pairing.userId,
      tokenHash: hashExtensionSecret(token),
      deviceName: pairing.deviceName,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    await tx
      .update(extensionPairings)
      .set({ status: "consumed", consumedAt: now, updatedAt: now })
      .where(eq(extensionPairings.id, pairing.id));
    return { status: "approved", token, connectionId, expiresAt };
  });

  setLogOperation(event, "extension.pairing.poll", { pairingId: id, status: result.status });
  return result;
});
