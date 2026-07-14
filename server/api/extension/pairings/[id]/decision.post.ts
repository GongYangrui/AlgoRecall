import { and, eq } from "drizzle-orm";
import { createError, getRouterParam } from "h3";
import { z } from "zod";
import { db } from "../../../../db";
import { extensionPairings } from "../../../../db/schema";
import { requireSession } from "../../../../utils/auth-session";
import { setLogOperation } from "../../../../utils/log-context";
import { assertRateLimit } from "../../../../utils/rate-limit";
import { nowIso } from "../../../../utils/time";

const inputSchema = z.object({
  decision: z.enum(["approve", "deny"]),
  userCode: z.string().trim().min(1).max(20),
});

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  await assertRateLimit(event, { bucket: "extension.pairing.decision", key: session.user.id, limit: 20, windowMs: 60_000 });
  const id = getRouterParam(event, "id") || "";
  const parsed = inputSchema.safeParse(await readBody(event));
  if (!id || !parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid pairing decision" });

  const result = await db.transaction(async (tx) => {
    const [pairing] = await tx
      .select()
      .from(extensionPairings)
      .where(and(eq(extensionPairings.id, id), eq(extensionPairings.userCode, parsed.data.userCode)))
      .limit(1)
      .for("update");
    if (!pairing) throw createError({ statusCode: 404, statusMessage: "Pairing not found", data: { code: "PAIRING_NOT_FOUND" } });
    if (Date.parse(pairing.expiresAt) <= Date.now()) {
      throw createError({ statusCode: 410, statusMessage: "Pairing expired", data: { code: "PAIRING_EXPIRED" } });
    }
    if (pairing.status !== "pending") {
      throw createError({ statusCode: 409, statusMessage: "Pairing already decided", data: { code: "PAIRING_ALREADY_DECIDED" } });
    }

    const now = nowIso();
    const status = parsed.data.decision === "approve" ? "approved" : "denied";
    const [updated] = await tx
      .update(extensionPairings)
      .set({ status, userId: session.user.id, decidedAt: now, updatedAt: now })
      .where(eq(extensionPairings.id, pairing.id))
      .returning();
    if (!updated) throw createError({ statusCode: 409, statusMessage: "Pairing could not be updated" });
    return updated;
  });

  setLogOperation(event, `extension.pairing.${parsed.data.decision}`, { pairingId: id });
  return { status: result.status, deviceName: result.deviceName };
});
