import { createError, getRequestURL } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  EXTENSION_DEVICE_NAME_MAX_LENGTH,
  EXTENSION_PAIRING_POLL_INTERVAL_MS,
  EXTENSION_PAIRING_TTL_MS,
  type ExtensionPairingCreateResponse,
} from "@shared/extension";
import { db } from "../../../db";
import { extensionPairings } from "../../../db/schema";
import { createPairingSecret, createUserCode, hashExtensionSecret } from "../../../utils/extension-credentials";
import { setLogOperation } from "../../../utils/log-context";
import { assertRateLimit } from "../../../utils/rate-limit";
import { nowIso } from "../../../utils/time";

const inputSchema = z.object({
  deviceName: z.string().trim().min(1).max(EXTENSION_DEVICE_NAME_MAX_LENGTH),
});

export default defineEventHandler(async (event): Promise<ExtensionPairingCreateResponse> => {
  await assertRateLimit(event, { bucket: "extension.pairing.create", limit: 10, windowMs: 60_000 });
  const parsed = inputSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid device name" });

  const pairingId = uuidv4();
  const pairingSecret = createPairingSecret();
  const userCode = createUserCode();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + EXTENSION_PAIRING_TTL_MS).toISOString();
  await db.insert(extensionPairings).values({
    id: pairingId,
    secretHash: hashExtensionSecret(pairingSecret),
    userCode,
    userId: null,
    deviceName: parsed.data.deviceName,
    status: "pending",
    expiresAt,
    createdAt,
    updatedAt: createdAt,
  });

  setLogOperation(event, "extension.pairing.create", { pairingId, deviceName: parsed.data.deviceName });
  const verificationOrigin = process.env.BETTER_AUTH_URL?.trim() || getRequestURL(event).origin;
  const verificationUrl = new URL("/extension/connect", verificationOrigin);
  verificationUrl.searchParams.set("pairing", pairingId);
  verificationUrl.searchParams.set("code", userCode);
  setResponseStatus(event, 201);
  return {
    pairingId,
    pairingSecret,
    userCode,
    verificationUrl: verificationUrl.toString(),
    expiresAt,
    pollIntervalMs: EXTENSION_PAIRING_POLL_INTERVAL_MS,
  };
});
