import { createHash, randomBytes, randomInt } from "node:crypto";
import { EXTENSION_TOKEN_PREFIX } from "../../shared/extension";

const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function hashExtensionSecret(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createPairingSecret() {
  return randomBytes(32).toString("base64url");
}

export function createExtensionToken() {
  return `${EXTENSION_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function createUserCode() {
  let value = "";
  for (let index = 0; index < 8; index += 1) value += PAIRING_ALPHABET[randomInt(PAIRING_ALPHABET.length)];
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}
