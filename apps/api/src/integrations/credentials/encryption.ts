import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "../../config/env";
import { IntegrationError } from "../core/errors";

const PREFIX = "igcm1";
const KEY_BYTES = 32;

export function parseIntegrationEncryptionKey(raw: string | undefined, nodeEnv: string) {
  if (!raw) {
    if (nodeEnv === "production") {
      throw new IntegrationError(
        "ENCRYPTION_KEY_INVALID",
        "INTEGRATION_ENCRYPTION_KEY is required in production.",
        500,
      );
    }
    if (nodeEnv === "test") {
      return Buffer.from("smrkomed-test-integration-aes-key");
    }
    throw new IntegrationError(
      "ENCRYPTION_KEY_INVALID",
      "INTEGRATION_ENCRYPTION_KEY is required. Generate a 32-byte hex key.",
      500,
    );
  }
  const trimmed = raw.trim();
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else {
    const fromB64 = Buffer.from(trimmed, "base64");
    key = fromB64.length === KEY_BYTES ? fromB64 : Buffer.from(trimmed, "utf8");
  }
  if (key.length !== KEY_BYTES) {
    throw new IntegrationError(
      "ENCRYPTION_KEY_INVALID",
      "INTEGRATION_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).",
      500,
    );
  }
  return key;
}

export function assertIntegrationEncryptionConfig() {
  const nodeEnv = process.env["NODE_ENV"] ?? env.nodeEnv;
  if (nodeEnv === "production") {
    parseIntegrationEncryptionKey(process.env["INTEGRATION_ENCRYPTION_KEY"] ?? env.integrationEncryptionKey, nodeEnv);
  }
}

function getKey() {
  return parseIntegrationEncryptionKey(process.env["INTEGRATION_ENCRYPTION_KEY"] ?? env.integrationEncryptionKey, process.env["NODE_ENV"] ?? env.nodeEnv);
}

export function encryptString(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptString(payload: string) {
  const [prefix, ivB64, tagB64, dataB64] = payload.split(":");
  if (prefix !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new IntegrationError("INVALID_CREDENTIALS", "Stored credentials are not valid ciphertext.", 500);
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new IntegrationError("INVALID_CREDENTIALS", "Unable to decrypt integration credentials.", 500);
  }
}

export function isEncryptedPayload(value: string) {
  return value.startsWith(`${PREFIX}:`);
}
