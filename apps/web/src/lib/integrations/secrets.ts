import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "s1";

function keyFromSecret() {
  const secret =
    process.env["AUTH_SECRET"] ??
    process.env["NEXTAUTH_SECRET"] ??
    "smrkomed-demo-auth-secret-replace-in-production-32";
  return scryptSync(secret, "smrkomed-integrations", 32);
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string) {
  const [prefix, iv, tag, data] = payload.split(".");
  if (prefix !== PREFIX || !iv || !tag || !data) {
    throw new Error("Invalid secret payload");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
